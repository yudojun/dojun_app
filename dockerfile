FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    git zip unzip \
    wget curl \
    openjdk-17-jdk \
    build-essential ccache \
    autoconf automake libtool pkg-config \
    libffi-dev libssl-dev \
    libsqlite3-dev zlib1g-dev \
    libncurses5-dev libncursesw5-dev \
    libreadline-dev libbz2-dev \
    liblzma-dev \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/android-sdk/cmdline-tools && \
    cd /opt/android-sdk/cmdline-tools && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O cmdline-tools.zip && \
    unzip cmdline-tools.zip && \
    rm cmdline-tools.zip && \
    mv cmdline-tools cmdline-tools-temp && \
    mkdir latest && \
    mv cmdline-tools-temp/* latest/



RUN python3 -m pip install --upgrade pip setuptools wheel
RUN pip install "cython<3.0"
RUN pip install "pyjnius<1.5"
RUN pip install buildozer "python-for-android<2024.01"


WORKDIR /app
