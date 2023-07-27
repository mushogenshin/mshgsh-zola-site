+++
title = "Houdini Docker Ubuntu Container on Apple Silicon"
template = "page.html"
date = 2023-07-27T10:52:00Z
[taxonomies]
tags = ["houdini", "docker", "MacOS", "hython"]
[extra]
summary = "Executing hython results in QEMU cpuinfo errors from USD lib"
+++

It's a great news that SideFX offers [Docker files](https://www.sidefx.com/download/daily-builds/?docker=true) for their Houdini software: especially when the Houdini Python API already provides a very promising [web server](https://www.sidefx.com/docs/houdini/hwebserver/index.html) module, which together mean powerful, novel, services can be thought of, given some "**ingenuity and web development skill**" -- a phrase I really like from this [Unreal Remote Control](https://docs.unrealengine.com/5.2/en-US/remote-control-for-unreal-engine/) documentation.

So I decided to give the **Houdini Docker (Ubuntu)** a spin! In this blog I'm documenting some interesting things specific to running on Apple silicon that I encountered along the way while having tinkered with it over a weekend.

### 1. Prevent Docker Desktop on Apple Silicon from defaulting to Ubuntu for ARM architecture

I'm on Docker Desktop `v4.21` on a M1 MacBook, and all my Ubuntu images if specified simply with a version, e.g. `FROM ubuntu:18.04`, turn out to be Ubuntu for ARM architecture, -- seemingly because Docker _infers_ from the host --, which in this case is _not_ what we want. So we have to edit the `Dockerfile` downloaded to include the hash if we want Docker to pull the correct Ubuntu for `amd64` architecture:

```bash
FROM ubuntu:18.04@sha256:dca176c9663a7ba4c1f0e710986f5a25e672842963d95b960191e2d9f7185ebe
```

And fear not, this is just a very first hiccup we'll be experiencing! Anyhow, after the next step we'll be able to build a Docker image with intended architecture, like so:

![AMD64 Docker image](/attachments/houdini-docker-amd64.png)

### 2. Bypass Houdini auto-install failure in the Ubuntu image due to "SSE" prompt

If we run `docker-compose build` now,

### 3. Error on executing hython due to QEMU cpuinfo support
