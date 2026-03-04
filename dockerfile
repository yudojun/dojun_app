FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Android SDK paths
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

# Install system deps
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    git zip unzip wget curl \
    openjdk-17-jdk \
    build-essential ccache \
    autoconf automake libtool pkg-config \
    libffi-dev libssl-dev \
    libsqlite3-dev zlib1g-dev \
    libncurses5-dev libncursesw5-dev \
    libreadline-dev libbz2-dev liblzma-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Android cmdline-tools
RUN mkdir -p /opt/android-sdk/cmdline-tools && \
    cd /opt/android-sdk/cmdline-tools && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O cmdline-tools.zip && \
    unzip cmdline-tools.zip && \
    rm cmdline-tools.zip && \
    mv cmdline-tools cmdline-tools-temp && \
    mkdir -p latest && \
    mv cmdline-tools-temp/* latest/
    
 # Fix old sdkmanager path expected by buildozer
RUN mkdir -p /opt/android-sdk/tools/bin && \
    ln -s /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager \
          /opt/android-sdk/tools/bin/sdkmanager

# Accept licenses + install fixed SDK packages (MATCHING your spec: api=30, ndk=25b)
RUN yes | sdkmanager --licenses

RUN sdkmanager \
  "platform-tools" \
  "platforms;android-30" \
  "build-tools;30.0.3" \
  "ndk;25.2.9519653" \
  "cmake;3.22.1"

# Python deps: pin versions for stability
RUN python3 -m pip install --upgrade pip setuptools wheel \
 && pip install "cython<3.0" \
 && pip install "pyjnius<1.5" \
 && pip install "python-for-android==2024.01.21" \
 && pip install "buildozer==1.5.0"

WORKDIR /app