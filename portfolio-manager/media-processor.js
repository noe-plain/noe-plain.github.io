const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Set static FFmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

// Ensure directory exists utility
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Helper to get format-specific settings for Sharp
 */
function getSharpSettings(format) {
    if (format === 'avif') {
        return { format: 'avif', options: { quality: 65, effort: 4 } };
    }
    if (format === 'webp') {
        return { format: 'webp', options: { quality: 75, effort: 4 } };
    }
    // Fallback/standard formats
    return { format: 'jpeg', options: { quality: 82, progressive: true } };
}

/** Four public variants per image; the source is kept separately in raw/. */
async function processImage(srcPath, destDir, baseNameWithoutExt, rawExt, standardExt = null) {
    const rawDestDir = path.join(destDir, 'raw');
    ensureDir(rawDestDir);
    ensureDir(destDir);
    const rawFilePath = path.join(rawDestDir, `${baseNameWithoutExt}${rawExt}`);
    fs.renameSync(srcPath, rawFilePath);
    const extension = standardExt === '.jpeg' ? '.jpeg' : '.jpg';
    const standardPath = path.join(destDir, `${baseNameWithoutExt}${extension}`);
    const mobileJpegPath = path.join(destDir, `${baseNameWithoutExt}-mobile.jpg`);
    const webpPath = path.join(destDir, `${baseNameWithoutExt}.webp`);
    const mobileWebpPath = path.join(destDir, `${baseNameWithoutExt}-mobile.webp`);
    const image = () => sharp(rawFilePath).rotate().flatten({ background: '#ffffff' });
    // Full dimensions and maximum JPEG quality. Smaller variants never upscale.
    await image().jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toFile(standardPath);
    await image().resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(mobileJpegPath);
    await image().resize({ width: 2560, withoutEnlargement: true }).webp({ quality: 85, effort: 4 }).toFile(webpPath);
    await image().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toFile(mobileWebpPath);
    return { success: true, rawPath: rawFilePath, standardPath, mobileJpegPath, webpPath, mobileWebpPath };
}

/**
 * Video processing pipeline (Asynchronous background runner)
 * - Moves raw file to raw/ subdirectory
 * - Returns status to client immediately
 * - Transcodes in background to H.264 MP4, Apple HEVC/H.265 MP4, HLS segments
 * - Extracts a WebP poster frame
 */
function processVideo(srcPath, destDir, baseNameWithoutExt, originalExt) {
    const rawDestDir = path.join(destDir, 'raw');
    const hlsDestDir = path.join(destDir, 'hls');
    ensureDir(rawDestDir);
    ensureDir(hlsDestDir);
    ensureDir(destDir);

    const rawFilePath = path.join(rawDestDir, `${baseNameWithoutExt}${originalExt}`);
    const statusFilePath = path.join(rawDestDir, `${baseNameWithoutExt}.status.json`);

    // Move raw file
    fs.renameSync(srcPath, rawFilePath);

    // Initial status file
    const status = {
        status: 'processing',
        progress: 0,
        startedAt: new Date().toISOString(),
        tasks: {
            poster: 'pending',
            h264: 'pending',
            h265: 'pending',
            hls: 'pending'
        }
    };
    fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

    // Run processing asynchronously in background
    setTimeout(async () => {
        try {
            // Task A: Extract WebP poster frame (first second)
            status.tasks.poster = 'processing';
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            const posterDest = path.join(destDir, `${baseNameWithoutExt}-poster.webp`);
            await extractPoster(rawFilePath, posterDest);

            status.tasks.poster = 'done';
            status.progress = 25;
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            // Task B: Transcode to H.264 MP4 (highly compatible)
            status.tasks.h264 = 'processing';
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            const h264Dest = path.join(destDir, `${baseNameWithoutExt}.mp4`);
            await transcodeH264(rawFilePath, h264Dest);

            status.tasks.h264 = 'done';
            status.progress = 50;
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            // Task C: Transcode to Apple HEVC/H.265 MP4
            status.tasks.h265 = 'processing';
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            const h265Dest = path.join(destDir, `${baseNameWithoutExt}-hevc.mp4`);
            await transcodeH265(rawFilePath, h265Dest);

            status.tasks.h265 = 'done';
            status.progress = 75;
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            // Task D: Transcode to HLS (Slice)
            status.tasks.hls = 'processing';
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            const hlsPlaylistDest = path.join(hlsDestDir, `${baseNameWithoutExt}.m3u8`);
            await generateHLS(rawFilePath, hlsPlaylistDest, baseNameWithoutExt);

            status.tasks.hls = 'done';
            status.progress = 100;
            status.status = 'done';
            status.completedAt = new Date().toISOString();
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));

            console.log(`Successfully completed video pipeline for: ${baseNameWithoutExt}`);
        } catch (error) {
            console.error(`Error in video pipeline for ${baseNameWithoutExt}:`, error);
            status.status = 'failed';
            status.error = error.message;
            fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 4));
        }
    }, 50);

    return {
        success: true,
        statusUrl: `/api/media/status/${baseNameWithoutExt}`,
        rawPath: rawFilePath,
        posterPath: `../../images/portfolio/${path.basename(destDir)}/${baseNameWithoutExt}-poster.webp`
    };
}

/**
 * Extracts a WebP poster frame from the video
 */
function extractPoster(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['1.0'],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath)
            })
            .on('end', () => {
                // If it output a jpg or png default, we rename/convert it using sharp
                // fluent-ffmpeg screenshots sometimes uses standard extensions
                const baseDir = path.dirname(outputPath);
                const fileList = fs.readdirSync(baseDir);
                const createdShot = fileList.find(f => f.startsWith(path.basename(outputPath, '.webp')) && f !== path.basename(outputPath));

                if (createdShot) {
                    const tempShotPath = path.join(baseDir, createdShot);
                    sharp(tempShotPath)
                        .webp({ quality: 80 })
                        .toFile(outputPath)
                        .then(() => {
                            fs.unlinkSync(tempShotPath);
                            resolve();
                        })
                        .catch(reject);
                } else {
                    resolve();
                }
            })
            .on('error', (err) => reject(err));
    });
}

/**
 * Transcodes video to optimized H.264 MP4
 */
function transcodeH264(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-crf 23',
                '-preset fast',
                '-pix_fmt yuv420p',
                '-movflags +faststart'
            ])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Transcodes video to Apple-compatible H.265/HEVC MP4
 */
function transcodeH265(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .videoCodec('libx265')
            .audioCodec('aac')
            .outputOptions([
                '-crf 26',
                '-preset fast',
                '-pix_fmt yuv420p',
                '-tag:v hvc1',
                '-movflags +faststart'
            ])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Generates HTTP Live Streaming (HLS) playlist and ts segments
 */
function generateHLS(videoPath, outputPath, baseSegmentName) {
    return new Promise((resolve, reject) => {
        const segmentsPath = path.join(path.dirname(outputPath), `${baseSegmentName}-segment-%d.ts`);
        ffmpeg(videoPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-profile:v baseline',
                '-level 3.0',
                '-start_number 0',
                '-hls_time 6',
                '-hls_list_size 0',
                '-f hls',
                `-hls_segment_filename ${segmentsPath}`
            ])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

module.exports = {
    processImage,
    processVideo,
    ensureDir
};
