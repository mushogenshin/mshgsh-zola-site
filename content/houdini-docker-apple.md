+++
title = "Houdini Docker Ubuntu Container on Apple Silicon"
template = "page.html"
date = 2023-07-27T10:52:00Z
[taxonomies]
tags = ["houdini", "docker", "MacOS", "hython"]
[extra]
summary = "Executing hython results in QEMU cpuinfo errors from USD lib"
+++

![Houdini Docker Ubuntu on Apple Silicon](/attachments/houdini-docker-apple-chip-cover.JPG)

It's a great news that SideFX offers [Docker files](https://www.sidefx.com/download/daily-builds/?docker=true) for their Houdini software: especially when the Houdini Python API already provides a very promising [web server](https://www.sidefx.com/docs/houdini/hwebserver/index.html) module, which together mean powerful, novel, services can be thought of, given some "**ingenuity and web development skill**" -- a phrase I really like from this [Unreal Remote Control](https://docs.unrealengine.com/5.2/en-US/remote-control-for-unreal-engine/) documentation.

So I decided to give the **Houdini Docker (Ubuntu)** a spin! In this blog I'm documenting some interesting things specific to running on Apple silicon that I encountered along the way while having tinkered with it over a weekend.

I'm assuming you have followed the necessary steps to edit the EULA date as outlined in the `README` in the downloaded zip from SideFX.

### 1. Prevent Docker Desktop on Apple Silicon from defaulting to Ubuntu for ARM architecture

I'm on Docker Desktop `v4.21` on a M1 MacBook, and all my Ubuntu images if specified simply with a version, e.g. `FROM ubuntu:18.04`, turn out to be Ubuntu for ARM architecture, -- seemingly because Docker _infers_ from the host --, which in this case is _not_ what we want. So we have to edit the first layer in the `Dockerfile` downloaded to include the hash if we want Docker to pull the correct Ubuntu for `amd64` architecture:

```bash
FROM ubuntu:18.04@sha256:dca176c9663a7ba4c1f0e710986f5a25e672842963d95b960191e2d9f7185ebe
```

And fear not, this is just a very first hiccup we'll experience going further! Anyhow, at the end of the next step we'll be able to build a Docker image with intended architecture, like so:

![AMD64 Docker image](/attachments/houdini-docker-amd64.png)

### 2. Bypass Houdini auto-install failure in the Ubuntu image due to "SSE" prompt

Now if we run `docker-compose build`, the process will exit before it can complete the last layer where it's supposed to unzip the Houdini Linux build and run the `houdini.install` script, because it prompts for a Yes/No question about whether we want to proceed, saying "Your CPU does not appear to support SSE", but the script defaults to _"No"_ for an answer.

Out of curiosity let's hijack this script to proceed none the less. We can tweak the last layers in the `Dockerfile` like so to default the answer to _"Yes"_ using `sed` in-place:

```bash
RUN tar -xf /houdiniInstaller/houdini* -C /houdiniInstaller \
    && cd /houdiniInstaller/houdini* \
    && sed -i 's/read ans/ans="y"/' houdini.install \
    && ./houdini.install --auto-install --accept-EULA ${EULA_DATE} \
    && rm -r /houdiniInstaller
```

After the small hack, our Houdini image will be successfully built, meaning we have installed Houdini on a Ubuntu AMD64 image on a MacBook, and theoretically can run it non-graphically to process any Houdini computations -- including serving our next peculiar idea of some web service _unique to Houdini capabilities_ (e.g. insane geometry processing, Vellum, KineFX, Solaris, anyone?), how cool is that?

### 3. Error on executing hython due to QEMU cpuinfo support

Following the subsequent instructions in the `README`, from this single Houdini image we can spawn two containers: one serving the license, and the other running hython.

- The first container of `sesinetd` runs with no problem:

```bash
docker-compose run -d -p 1715:1715 sesinetd
```

![sesinetd](/attachments/houdini-docker-sesinetd.png)

- What unfortunately won't be working (on Apple silicon, that is) is with the second container where we want to execute hython:

```bash
docker-compose run hython
```

From the resulted console, we encounter an obscure message from the USD lib complaining about missing information in the /proc/cpuinfo :

```bash
root@hython:/# cd /opt/hfs19.5/bin
root@hython:/opt/hfs19.5/bin# ./hython
 ArchError: Could not find 'cpu MHz' in /proc/cpuinfo
  Function: Arch_ComputeNanosecondsPerTick
      File: /home/prisms/builder-new/WeeklyDevTools19.5/dev_tools/src/usd/usd-22.05/USD-py3.7/pxr/base/arch/timing.cpp
      Line: 149
qemu: uncaught target signal 6 (Aborted) - core dumped
Aborted
root@hython:/opt/hfs19.5/bin#
```

Hmm, that's disappointing! Now where should we file an issue: to Docker? or to SideFX? or to Pixar?

After doing some searching, I believe this belongs to [QEMU](https://www.qemu.org/) supports for machine emulators, and the issue is with our Ubuntu AMD64 environment being emulated on Apple chip, see this [GitLab issue](https://gitlab.com/qemu-project/qemu/-/issues/750).

This was when I had to sadly halt my tinkering with Houdini Docker on Apple chip.

If anyone has some ideas to overcome this please let me know.

What for next weekends? I don't think I'll test Houdini Docker Ubuntu on a Mac with Intel chip, which leaves only the Houdini Docker Windows in sight.
