+++
title = "🔖 Exercise 2: Move Assets to SubDirs"
template = "page.html"
date = 2023-03-05T15:00:00Z
[taxonomies]
tags = ["unreal", "c++"]
+++

- [Goal](#goal)
- [Pitfalls](#Pitfalls)
- [Suggested Solution](#suggested-solution)
- [Considerations](#considerations)

<hr>

#### Goal

- The tool should help users to organize the existing assets into their proper subdirectories by type, for example:
  - `Skeleton` and `Skeletal Mesh` should reside in `Meshes` subdirectory.
  - `Physics Asset`, `IK Rig`, `IK Retargeter`, and `Control Rig`, should reside in `Rigs` subdirectory.
  - `Anim Sequence`, `Anim Blueprint`, and `BlendSpace`, should reside in `Demo/Animations` subdirectory.
- If an asset already resides in some matching subdirectory, then the tool shouldn't put it into another subdirectory.

#### Pitfalls

- We can use a `TMap<UClass*, FString>` to hard code the relationship between an asset type and their matching subdirectory. But the first challenge is to provide the proper `include` directives so that our desired `UClass`es can be found. When we are still new with C++ and with the build process of Unreal overall, this is quite tricky.
- To move an asset, we'll use `UEditorAssetLibrary::RenameLoadedAsset` method, but we'll have to make sure the asset is indeed loaded first.

### Suggested Solution

#### Build.cs file

- (1): "`IKRig`" module is needed for `UIKRigDefintion` and `UIKRetargeter` classes.
- (2): "`ControlRig`" module is needed for `UControlRig` class, but usually we deal with `UControlRigBlueprint` class, so we also need "`ControlRigDeveloper`" module.
- (3): "`LevelSequence`" module is needed for `ULevelSequence` class.

```cs
using UnrealBuildTool;

public class TruongControlRigs : ModuleRules
{
	public TruongControlRigs(ReadOnlyTargetRules Target) : base(Target)
	{
            // --snip--
		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"CoreUObject",
			"Engine"
		});

		PublicDependencyModuleNames.AddRange(new string[] {
			"Core",
			"InputCore",
			"Blutility",
			"EditorScriptingUtilities",
			"UnrealEd",
			"IKRig", // (1)
			"ControlRig", // (2)
			"ControlRigDeveloper", // (2)
			"LevelSequence" // (3)
		});
	}
}
```

#### Header file

Then, same drill with the [previous exercise](/ue_cpp/exercise-1/), we define an `inline static const` variable for our mapping (4). Our method doesn't have any parameters (5) as we're allowing the tool to process everything automatically in this exercise, which is not a very flexible design, but we'll accept that for practice purpose.

```cpp
#pragma once
#include "CoreMinimal.h"
#include "AssetActionUtility.h"
#include "PhysicsEngine/PhysicsAsset.h"
#include "Rig/IKRigDefinition.h" // (1)
#include "Retargeter/IKRetargeter.h" // (1)
#include "ControlRig.h" // (2)
#include "ControlRigBlueprint.h" // (2)
#include "Animation/BlendSpace1D.h"
#include "LevelSequence.h" // (3)
#include "mkCharSetup.generated.h"

UCLASS()
class TRUONGCONTROLRIGS_API UmkCharSetup : public UAssetActionUtility
{
	GENERATED_BODY()
private:
	inline static const TMap<UClass*, FString> AssetTypeToFolder = {
		// `Meshes` folder
		{USkeleton::StaticClass(), TEXT("Meshes")},
		{USkeletalMesh::StaticClass(), TEXT("Meshes")},
		// `Rigs` folder
		{UPhysicsAsset::StaticClass(), TEXT("Rigs")},
		{UIKRigDefinition::StaticClass(), TEXT("Rigs")},
		{UIKRetargeter::StaticClass(), TEXT("Rigs")},
		{UControlRig::StaticClass(), TEXT("Rigs")},
		{UControlRigBlueprint::StaticClass(), TEXT("Rigs")},
		// `Textures` folder
		{UTexture::StaticClass(), TEXT("Textures")},
		// `Materials` folder
		{UMaterial::StaticClass(), TEXT("Materials")},
		// `Demo/Animations` folder
		{UAnimSequence::StaticClass(), TEXT("Demo/Animations")},
		{UBlendSpace::StaticClass(), TEXT("Demo/Animations")},
		{UBlendSpace1D::StaticClass(), TEXT("Demo/Animations")},
		{UAnimBlueprint::StaticClass(), TEXT("Demo/Animations")},
		// `Maps` folder
		{UWorld::StaticClass(), TEXT("Maps")},
		{ULevel::StaticClass(), TEXT("Maps")},
		// `Sequences` folder
		{ULevelSequence::StaticClass(), TEXT("Sequences")},
	}; // (4)
public:
    UFUNCTION(CallInEditor)
	static void MoveAssetsToSubDirs(); // (5)
};
```

#### cpp file

- A selected asset might _not_ be within our `AssetTypeToFolder` definition, so we'll skip processing it if nothing valid is found in the mapping (6).
- We also don't want to create another subdirectory if some other subdirectory with the same name is already in the path of the asset (7).
- Finally we want to load the asset first (8) before moving it with `UEditorAssetLibrary::RenameLoadedAsset` (9).

```cpp
void UmkCharSetup::MoveAssetsToSubDirs()
{
	for (TArray<UObject*> SelectedObjects = UEditorUtilityLibrary::GetSelectedAssets(); const UObject* Object :
	     SelectedObjects)
	{
		if (!ensure(Object)) { continue; }

		const FString* SubDirName = AssetTypeToFolder.Find(Object->GetClass());
		if (!(ensure(SubDirName) && !SubDirName->IsEmpty())) // (6)
		{
			UE_LOG(LogTemp, Warning, TEXT("No subdirectory defined for class %s"), *Object->GetClass()->GetName());
			continue;
		}

		FString CurrAssetPath = Object->GetPackage()->GetPathName();
		if (CurrAssetPath.Contains(*SubDirName)) // (7)
		{
			UE_LOG(LogTemp, Display, TEXT("Skipping %s as it's already in a correct subdirectory"), *CurrAssetPath);
			continue;
		}

		// We must load the asset first or else we'll have problem moving it.
		UObject* LoadedAsset = UEditorAssetLibrary::LoadAsset(CurrAssetPath); // (8)
		if (!ensure(LoadedAsset))
		{
			UE_LOG(LogTemp, Warning, TEXT("Failed to load asset at path: %s"), *CurrAssetPath);
			continue;
		}

		FString NewAssetPath = FPaths::Combine(FPaths::GetPath(CurrAssetPath), *SubDirName, *Object->GetName());
		UEditorAssetLibrary::RenameLoadedAsset(LoadedAsset, NewAssetPath); // (9)
	}
}
```

#### Considerations

- We may provide support for _any_ type of assets -- instead of only the types included in our `TMap` -- by resorting to its class name.
- A preview of **which goes where** would be helpful for the user before they decide to proceed with the operation, but let's settle with this for now 😼.
