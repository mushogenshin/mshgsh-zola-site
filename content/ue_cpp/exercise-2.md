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

#### Pitfalls

### Suggested Solution

#### Build.cs file

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
			"IKRig",
			"ControlRig",
			"ControlRigDeveloper",
			"LevelSequence"
		});
	}
}
```

#### Header file

```cpp
#pragma once
#include "CoreMinimal.h"
#include "AssetActionUtility.h"
#include "PhysicsEngine/PhysicsAsset.h"
#include "Rig/IKRigDefinition.h"
#include "Retargeter/IKRetargeter.h"
#include "ControlRig.h"
#include "ControlRigBlueprint.h"
#include "Animation/BlendSpace1D.h"
#include "LevelSequence.h"
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
	};
public:
    UFUNCTION(CallInEditor)
	static void MoveAssetsToSubDirs();
};
```

#### cpp file

```cpp
void UmkCharSetup::MoveAssetsToSubDirs()
{
	for (TArray<UObject*> SelectedObjects = UEditorUtilityLibrary::GetSelectedAssets(); const UObject* Object :
	     SelectedObjects)
	{
		if (!ensure(Object)) { continue; }

		const FString* SubDirName = AssetTypeToFolder.Find(Object->GetClass());
		if (!(ensure(SubDirName) && !SubDirName->IsEmpty()))
		{
			UE_LOG(LogTemp, Warning, TEXT("No subdirectory defined for class %s"), *Object->GetClass()->GetName());
			continue;
		}

		FString CurrAssetPath = Object->GetPackage()->GetPathName();
		if (CurrAssetPath.Contains(*SubDirName))
		{
			UE_LOG(LogTemp, Display, TEXT("Skipping %s as it's already in a correct subdirectory"), *CurrAssetPath);
			continue;
		}

		// We must load the asset first or else we can't move it
		UObject* LoadedAsset = UEditorAssetLibrary::LoadAsset(CurrAssetPath);
		if (!ensure(LoadedAsset))
		{
			UE_LOG(LogTemp, Warning, TEXT("Failed to load asset at path: %s"), *CurrAssetPath);
			continue;
		}

		FString NewAssetPath = FPaths::Combine(FPaths::GetPath(CurrAssetPath), *SubDirName, *Object->GetName());
		UEditorAssetLibrary::RenameLoadedAsset(LoadedAsset, NewAssetPath);
	}
}
```

#### Considerations
