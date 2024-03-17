+++
title = "🔖 Exercise 1: Make Template Folders"
template = "page.html"
date = 2023-03-03T21:00:00Z
[taxonomies]
tags = ["Unreal", "C++"]
+++

- [Goal](#goal)
- [Pitfall](#Pitfall)
- [Suggested Solution](#suggested-solution)
- [Considerations](#considerations)

<hr>

#### Goal

- Given an asset name, e.g. name of a character or a prop, the tool should automatically make a series of sub-folders for that asset. For example: given "`Velociraptor`" string, it must make these folders:
  - `/Game/Velociraptor/Meshes`
  - `/Game/Velociraptor/Rigs`
  - `/Game/Velociraptor/Textures`
  - `/Game/Velociraptor/Materials`
  - `/Game/Velociraptor/Maps`
  - `/Game/Velociraptor/Sequences`
  - `/Game/Velociraptor/Demo/Animations`,

where the list of required folders is **hard coded** for now.

- The tool should take also an _optional_ parent folder in case user wants to organize the resulted folders further.

#### Pitfall

At the time of my writing, GitHub Copilot will mostly suggest you to use `IPlatformFile`. With `IPlatformFile` I managed to make it work on MacOS, but not on Windows. After a couple hours troubleshooting, this is what I found.

👉 Do not use `IPlatformFile` if you want nested folders, use `IFileManager` instead.

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

### Suggested Solution

We'll use [Scripted Actions](https://docs.unrealengine.com/5.3/en-US/scripted-actions-in-unreal-engine/) for this exercise, saving the juicy [widgets](https://docs.unrealengine.com/5.3/en-US/editor-utility-widgets-in-unreal-engine/) for next exercises.

#### Header file

- Our function doesn't mutate any data it receives, so we should mark it as `static` (1).
- As a result, our `TArray<FString> TemplateFolders` where we define the list of folders to be created has to be `inline static const` (2).

```cpp
#pragma once
#include "CoreMinimal.h"
#include "AssetActionUtility.h"
#include "mkCharSetup.generated.h"

UCLASS()
class TRUONGCONTROLRIGS_API UmkCharSetup : public UAssetActionUtility
{
	GENERATED_BODY()
public:
	UFUNCTION(CallInEditor)
	static void MakeCharacterFolders(const FString& CharacterName, const FString& ParentFolder); // (1)
private:
	inline static const TArray<FString> TemplateFolders = {
		"Meshes",
		"Rigs",
		"Textures",
		"Materials",
		"Demo/Animations",
		"Maps",
		"Sequences",
	}; // (2)
};
```

#### cpp file

- We'll need to include the `HAL/PlatformFileManager` for [filesystem-related actions](https://docs.unrealengine.com/5.3/en-US/API/Runtime/Core/HAL/FFileManagerGeneric/).
- If user also specifies a parent folder, we concatenate it to our paths (3).
- If the directory already exists, we `continue` to the next iteration (4).
- The `FileManager.MakeDirectory` returns a `bool` of [whether the operation succeeds](https://docs.unrealengine.com/5.3/en-US/API/Runtime/Core/HAL/FFileManagerGeneric/) (but unfortunately not the reason why it would fail), so we can use that to log when an error occurs (5).

```cpp
#include "mkCharSetup.h"
#include "EditorUtilityLibrary.h"
#include "HAL/PlatformFilemanager.h"

void UmkCharSetup::MakeCharacterFolders(const FString& CharacterName, const FString& ParentFolder)
{
	IFileManager& FileManager = IFileManager::Get();
	// Construct the full path to the /Game directory
	const FString ContentDir = FPaths::ProjectContentDir();

	for (const FString& Folder : TemplateFolders)
	{
		FString FolderPath;
		if (ParentFolder.IsEmpty()) // (3)
		{
			FolderPath = FPaths::Combine(ContentDir, CharacterName, Folder);
		}
		else
		{
			FolderPath = FPaths::Combine(ContentDir, ParentFolder, CharacterName, Folder);
		};

		if (FileManager.DirectoryExists(*FolderPath))
		{
			continue; // (4)
		}

		UE_LOG(LogHAL, Display, TEXT("Attempting to make directory: %s"), *FolderPath);
		if (!FileManager.MakeDirectory(*FolderPath, true)) // (5)
		{
			UE_LOG(LogHAL, Warning, TEXT("Failed to create directory at path: %s"), *FolderPath);
		}
	}
}
```

#### Considerations

Since this is a [scripted asset action](https://docs.unrealengine.com/5.3/en-US/scripted-actions-in-unreal-engine/), we have to select _some_ asset to see the our function as an item in the context menu, which is rather inconvenient. We'll improve this once we learn about Unreal widgets.
