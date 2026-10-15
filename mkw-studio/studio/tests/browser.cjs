const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs');
async function launch(){const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',executablePath=process.env.CHROME_PATH||(process.platform==='darwin'&&fs.existsSync(localChrome)?localChrome:undefined);return chromium.launch({headless:true,...(executablePath?{executablePath}:{})})}
const path=require('node:path'),os=require('node:os');function artifact(name){const directory=process.env.MKW_TEST_OUTPUT||os.tmpdir();fs.mkdirSync(directory,{recursive:true});return path.join(directory,name)}
module.exports={launch,artifact};
