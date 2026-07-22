+++
title = "Examples of Doing Procedural Animation Using Control Rig in Unreal"
template = "page.html"
date = 2025-10-30T23:59:00Z
draft = true
[taxonomies]
tags = ["control-rig", "unreal", "procedural", "animation"]
[extra]
summary = "With the well thought-out development behind Control Rig, doing procedural animation in Unreal has got easier, and allows for creative solutions in gameplay animation"
+++

Have you ever wondered of some different way you can implement your gameplay animation? Since its advent in around 2020, Control Rig has been being under some radical development to make runtime/interactive animation in Unreal more flexible to achieve and refactor. In this article I'd like to use a couple concrete examples and implementations to show how you can use the Control Rig node in AnimBP in concert with other gameplay framework elements you may already be familiar with, in order to either provide alternative solutions to old gameplay animation problems, or to approach new gameplay animation problems with simpler or more modular solutions than traditional ones.

The examples here come from real game problems I and my team encountered over the one and a half year.

<!-- TODO: images with all three examples -->

---

# Synopsis

### 1. A ballista peddler

In this scenario, a third-person character needs not only to wander about the map, but also to operate a ballista. Think of her as a peddler of destruction, her cart a deadly bolt thrower. We want the player to be able to control the firing weapon action from this character, shooting arrows at whim just by pressing an input. Sounds simple enough, but instead of implementing the ballista's mechanics -- its winding up phase and release phase -- using the traditional route of Blend Space, State Machine, with a fixed set of premade Animation Sequence assets, we can create the animation procedurally in relation to the player input.

If you recognize the bow-and-arrow setup, you're correct, this is virtually a 90-degree twist to it, but we're using this as an opportunity to illuminate the ease and the power when integrating Control Rig with AnimBP for runtime animation.

### 2. Dinosaur leg moves

Imagine you ate some funky mushroom one night and you had this strange urge to put in your game some "Dino skaters": dinosaurs that doing rollerblading moves in a race. But you needed those animal skating animations done quickly -- say, for three different types of dinosaur in a week --, without breaking your bank, and most importantly, the animations must be reactive to the player input and should allow for composition. The production constraints make it an ideal case to think about procedural animation, where new animations can be easily produced once you got the workflow down, and they are created in context, so that you can test them in your gameplay iteratively.

For example, when the player wants to start skating towards the right, the animals should dip and lean towards their rights, with their left legs pushed farther away to the side, their long tails following through, their heads wobbling slightly.

### 3. A ragdoll (sometimes) doing Taichi

Our last example involves a pet that players can interact with in multiple modes: the players can drag it around as a ragdoll, and the players can also tug parts of its body, e.g. hands, feet, tail -- and in doing so creating a feeling that the pet is doing Taichi moves. If you're familiar, you can quickly see the latter mode is a basic FBIK (Full-Body IK) setup. Two questions then arise, are that:

1. How we can seamlessly switch the effect of the interaction mode on the character, i.e. from passively being dragged to a more "autonomous" FBIK?
2. In the FBIK mode, without a visible selection model, how can we move specific IK targets accordingly to the player's intention, i.e. in order to allow the player to intuitively drag the pet's left foot, then its right hand, then its head? 

These high interactivity requirements serve as an appealing case to realize the role of using Control Rig intensively in gameplay animation.

---

# Detailed Analysis/Breakdowns

- [Ballista Peddler](#1-ballista-peddler)
- [Dino Skaters](#2-dino-skaters)
- [Multi-modal Pets](#3-multi-modal-pets)



### 1. Ballista Peddler

#### 1A. Winding up phase
#### 1B. Release phase

---

### 2. Dino Skaters

#### 2A. Vehicle rig
#### 2B. Anim instance

---

### 3. Multi-modal Pets

#### 3A. Hit-testable pets
#### 3B. Interactable ragdoll
#### 3C. Interactable FBIK targets


