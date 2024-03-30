+++
title = "🍖 UE: Spine Study - After Jeremie Passerin"
template = "page.html"
date = 2023-03-16T15:00:00Z
draft = true
[taxonomies]
tags = ["Unreal", "Control Rig"]
+++

### Features

- Good arc between pelvis and chest for free
- Impose Max Stretch of the spine

### 1. Setup Spine (Construction Event)

#### Assumptions/Conditions:

- Number of `FK Buffers` and `FK Controls` must match that of the spine bones.
- The **second** and **second-to-last** bones will be used for placing the tangents of the spline, so the spine should have at least **four** bones.
- Initial transforms of all FK and IK controls will be exactly the corresponding bones' bind pose transforms.

#### Steps

1. Parenting (Optional)
2. Match transforms of the `FK Buffers` and subsequently the `FK Controls` to those of `Bones`
3. Match transforms of the `IK Controls` (two main controls and two tangent controls) to four of the `Bones`
4. Record initial length.

### 2. Spline IK (Forward Solve)

1. Record the U value of each bone.
2.
