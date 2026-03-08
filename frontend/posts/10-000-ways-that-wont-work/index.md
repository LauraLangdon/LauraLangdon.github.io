---
title: "10,000 Ways That Won’t Work"
slug: 10-000-ways-that-wont-work
status: published
featured: false
date: 2019-09-27T16:17:00.000-07:00
tags:
  - "Blog"
  - "fast.ai"
  - "Deep Learning"
  - "#post-card-rose"
  - "#Import 2026-03-08 05:42"
excerpt: "Lesson 3 of “Practical Deep Learning for Coders” by fast.ai"
feature_image: https://staging.lauralangdon.io/content/images/2023/05/1_L0UbDLtAuq7w2CfjqUH1xw.jpg
feature_image_alt: "Woman looking at a laptop and biting a pencil in frustration"
---

> “I have not failed. I’ve just found 10,000 ways that won’t work.”  
>   
> ~Thomas Edison

I’m a math adjunct working my way through [Lesson 3](https://course.fast.ai/videos/?lesson=3) of [“Practical Deep Learning for Coders”](https://course.fast.ai/) by fast.ai, and this week has been a major pride-swallower for me. At the end of Lesson 2, I was able to build a model that [classified paintings as having been painted by either Picasso or Monet](https://towardsdatascience.com/can-deep-learning-perform-better-than-pigeons-d37ef1581a2f), and put my model into production ([try it here!](https://picasso-or-monet.onrender.com/)).

This week, however, I wasn’t able to produce anything. I followed my usual fast.ai workflow: I watched the lecture once, then watched again while working through the notebooks, pausing as needed. I kept the invaluable [detailed version of the lecture notes](https://github.com/hiromis/notes/blob/master/Lesson3.md) handy as I went through the second (third, fourth…) time.

![](https://cdn-images-1.medium.com/max/1600/1*FSer6FHg5nwVKicPL18TOQ.jpeg)

Photo by [Lukas Blazek](https://unsplash.com/@goumbik?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/studying?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

So this week, I opened the first notebook used in the lecture, which was a multi-label classifier using Kaggle’s [“Planet: Understanding the Amazon from Space”](https://www.kaggle.com/c/planet-understanding-the-amazon-from-space) dataset. I planned to run the notebook with that dataset, as in the lecture, then get another dataset and make sure I could still make it work.

But I couldn’t even get the notebook to run as it did in the lecture. Getting the data using the Kaggle API, looking at the data, fitting the head of the network, and fitting one cycle all went fine, but then when it was time to make a learning rate plot for the whole model, I got the following error:

`RuntimeError: CUDA out of memory. Tried to allocate 2.00 MiB (GPU 0; 7.43 GiB total capacity; 6.89 GiB already allocated; 2.94 MiB free; 47.24 MiB cached)`

Undaunted, I turned to the fast.ai forums to see if anyone else had had this issue. [Someone had](https://forums.fast.ai/t/lesson-3-in-class-discussion/29733/608?u=go_go_gadget), and their problem was resolved by reducing the batch size. Maybe that would work for me, too!

Nope. I tried setting the batch size to 32 by passing `bs=32` as an argument to the `databunch()` function, and also tried `bs=16`, `bs=4`,and `bs=2`, but I kept getting the same error. `bs=1` gave me a different error, because the function makes comparisons, so it needed more than one item per batch. So I [posted to the forum myself](https://forums.fast.ai/t/lesson-3-in-class-discussion/29733/761?u=go_go_gadget).

No one responded to that question, but I found a [doc on the fast.ai site about CUDA memory errors](https://docs.fast.ai/troubleshoot.html#cuda-out-of-memory-exception). It said to reduce the batch size or train a smaller model, which was what I’d tried, so since I’d spent three full days trying to solve this problem by then, I set the notebook aside at that point.

The other notebooks — on image segmentation using the [CAMVID dataset](http://mi.eng.cam.ac.uk/research/projects/VideoRec/CamVid/), and image regression using the [BIWI head pose dataset](https://data.vision.ee.ethz.ch/cvl/gfanelli/head_pose/head_forest.html#db) went fine, at least.

At the end of the lecture, Jeremy said we should try to think of an interesting multi-label classification, image regression, or image segmentation problem to try on our own, and warned us that the most challenging part would be creating our databunch. He was definitely right about that!

The fastai library has a tool called the data\_block API, which does a lot of the heavy lifting involved in splitting your data into train and validation sets, along with their labels, and sets them up to load into your model. There are only ten lines of code involved, but I didn’t really understand what Step 0 was: I couldn’t figure out if how to choose a dataset for it, how to get that dataset ready to become a databunch, and generally, I just found it impenetrable. Over the next four days, I read the [data\_block API doc](https://docs.fast.ai/data_block.html), Wayde Gilliam’s [“Finding Data Block Nirvana (a journey through the fast ai data block API)](https://blog.usejournal.com/finding-data-block-nirvana-a-journey-through-the-fastai-data-block-api-c38210537fe4),” and dozens of forum posts, but I still just.didn’t.get it.

![](https://cdn-images-1.medium.com/max/1600/1*L0UbDLtAuq7w2CfjqUH1xw.jpeg)

Photo by [JESHOOTS.COM](https://unsplash.com/@jeshoots?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/studying?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

Jeremy says we’ll be coming back to the data\_block API frequently, so I’m going take the advice of the image below (a slide from Lesson 1 of the course) and will swallow my pride and move on to Lesson 4 without feeling like I’ve even slightly mastered Lesson 3. Womp-womp.

![](https://cdn-images-1.medium.com/max/1600/1*nmikQjBlmyRF0LaqDRHXLQ.png)

Slide from Lesson 1 of the course, found on [https://hackernoon.com/how-not-to-do-fast-ai-or-any-ml-mooc-3d34a7e0ab8c](https://hackernoon.com/how-not-to-do-fast-ai-or-any-ml-mooc-3d34a7e0ab8c)

Other posts on this topic:

Lesson 1: [Getting Started With fast.ai](https://towardsdatascience.com/getting-started-with-fast-ai-350914ee65d2)

Lesson 2: [Classifying Pregnancy Test Results](https://towardsdatascience.com/classifying-pregnancy-test-results-99adda4bca4c)!

Lesson 2 (the sequel): [Can Deep Learning Perform Better than Pigeons?](https://towardsdatascience.com/can-deep-learning-perform-better-than-pigeons-d37ef1581a2f)

Lesson 4: [Predicting a Waiter’s Tips](https://towardsdatascience.com/predicting-a-waiters-tips-1990342a0d02)

Lesson 5: [But Where Does the Pickle Go?](https://towardsdatascience.com/but-where-does-the-pickle-go-53619676bf5f)

Lesson 6: [Everybody Wants to be a Cat](https://towardsdatascience.com/everybody-wants-to-be-a-cat-6dd6190c5d9c)I’m a mathematics lecturer at CSU East Bay, and an aspiring data scientist. Connect with me on [LinkedIn](https://linkedin.com/in/laura-langdon/), or say hi on [Twitter](https://twitter.com/laura_e_langdon).
