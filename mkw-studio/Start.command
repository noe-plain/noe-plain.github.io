#!/bin/zsh
cd "${0:A:h}"
if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv || exit 1
fi
if ! .venv/bin/python -c 'import PIL' >/dev/null 2>&1; then
  .venv/bin/python -m pip install --no-index --find-links vendor Pillow==11.3.0 || .venv/bin/python -m pip install Pillow==11.3.0 || exit 1
fi
.venv/bin/python server.py "$@"
