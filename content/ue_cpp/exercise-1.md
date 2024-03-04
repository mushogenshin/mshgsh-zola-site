+++
title = "Exercise 1: Make Template Folders"
template = "page.html"
date = 2023-03-03T21:00:00Z
[taxonomies]
tags = ["unreal", "c++"]
+++

I managed to write something that runs on MacOS, but not on Windows. After a couple hours troubleshooting, this is what I found.

**TLDR**: do not use `IPlatformFile` if you want nested folders, use `IFileManager` instead.
At the time of my writing, GitHub Copilot will mostly suggest you to use `IPlatformFile`.

```cpp
#include "HAL/PlatformFilemanager.h"
    // --snip--

    // DO NOT use this if you want nested folders, as it doesn't allow
    // creating directories recursively, so this will fail on Windows:
    // IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();

    // Use this instead:
    IFileManager& FileManager = IFileManager::Get();
    // so that we can pass `true` to the `Tree` argument
    // of this `MakeDirectory` method:
    FileManager.MakeDirectory(*FolderPath, true);

```
