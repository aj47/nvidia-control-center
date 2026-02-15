#!/bin/bash

mkdir -p resources/bin

cd nvidia-cc-rs

cargo build -r

# Handle different platforms
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    cp target/release/nvidia-cc-rs.exe ../resources/bin/nvidia-cc-rs.exe
else
    # Unix-like systems (macOS, Linux)
    cp target/release/nvidia-cc-rs ../resources/bin/nvidia-cc-rs
fi

cd ..

# Sign the binary on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🔐 Signing Rust binary..."
    ./scripts/sign-binary.sh
fi
