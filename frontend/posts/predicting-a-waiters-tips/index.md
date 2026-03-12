---
title: "Predicting a Waiter’s Tips"
slug: predicting-a-waiters-tips
status: published
featured: false
date: 2019-10-06T16:15:00.000-07:00
tags:
  - "Blog"
  - "fast.ai"
  - "Deep Learning"
  - "#post-card-rose"
  - "#Import 2026-03-08 05:42"
excerpt: "Lesson 4 of “Practical Deep Learning for Coders” by fast.ai"
feature_image: https://staging.lauralangdon.io/content/images/2023/05/1_e3LisARxj0MwvVGhNndBLA.png
feature_image_alt: "Table of values"
---

In Lesson 4 of [“Practical Deep Learning for Coders”](https://course.fast.ai/) by fast.ai, we discover how to how to use deep learning and collaborative filtering to solve tabular data problems. As I always do with the fast.ai lectures, I [watched the lecture](https://course.fast.ai/videos/?lesson=4) through once, then watched it again as I ran through the notebooks, pausing as needed. When I finished that, I wanted to make sure I could replicate the process with a different dataset, and I chose the Kaggle dataset “[A Waiter’s Tips](https://www.kaggle.com/jsphyg/tipping)” by Joe Young. With this dataset, we want to make a model to predict the tip amount for a waiter in a restaurant.

I start by downloading dataset and unzipping it, checking for missing values (there are none!), then uploading the tips.csv file to the ‘data’ folder in the working directory.

After `from fastai.tabular import *` , I need to edit the notebook to make the path point to the right place, since the notebook default path points to the dataset used in the lecture. My data is in the ‘data’ folder, so I set the path accordingly, and tell it to store the data in a Pandas `DataFrame`:path = Path(‘data’)  
df = pd.read\_csv(path/’tips.csv’)

Then I set up the column names, dependent variable, and preprocessing functions. Since I want to predict the tip amount based on the other factors I set `tip` as the dependent variable, and since `sex`, `smoker` status, and`day` of the week can be selected from short lists of possibilities, I set those as “categorical” variables. The `total_bill` and the `size` are just numbers, so those are “continuous” variables. I had to think for a minute about the`time` of day, though: “time” feels like a continuous idea, but looking at the data, I see that “time” is defined as being either “lunch” or “dinner.” Categorical, then.

The preprocessing functions `FillMissing`, `Categorify`, and `Normalize` come with the notebook, and I keep them as they are for now.dep\_var = 'tip'  
cat\_names = \['sex', 'smoker', 'day', 'time'\]  
cont\_names = \['total\_bill', 'size'\]  
procs = \[FillMissing, Categorify, Normalize\]

(This California girl was surprised to see ‘smoker’ listed as a possible attribute of a restaurant patron)

Next, I need to choose a size for my test set. We usually set aside 20% of the data for the test set, so since my dataset has 244 elements, I set the test set to use a range of indices from 196–244.test = TabularList.from\_df(df.iloc\[196:244\].copy(), path=path, cat\_names=cat\_names, cont\_names=cont\_names)

Then it’s time to use the fastai library’s Datablock API to create my `databunch`:data = (TabularList.from\_df(df, path=path, cat\_names=cat\_names,    cont\_names=cont\_names, procs=procs)  
.split\_by\_idx(list(range(196,244)))  
.label\_from\_df(cols=dep\_var)  
.add\_test(test)  
.databunch())

I check out a batch of the data:

`data.show_batch(rows=10)`

![Table of training data showing sex, smoker, day, time, total_bill, size, and tip target columns with normalized values](https://cdn-images-1.medium.com/max/1600/1*e3LisARxj0MwvVGhNndBLA.png)

The `total_bill` and `size` often have negative values? I don’t think the restaurant paid any patrons to eat there, so this must a result of the call to the `Normalize` preprocessing. I check [the docs](https://docs.fast.ai/tabular.data.html#TabularProcessor) and don’t find what `Normalize` actually does, so I return to the [detailed lecture notes](https://github.com/hiromis/notes/blob/master/Lesson4.md) and find this:

“`Normalize` : Do a normalization ahead of time which is to take continuous variables and subtract their mean and divide by their standard deviation.” Okay, then this is just the same as a z-score in statistics, so it makes sense that values below the mean would be negative.

I declare my learner, telling the API that it’ll be a tabular learner (as opposed to a convolution neural network learner, for instance), and keep the parameters used in the lecture:

`learn = tabular_learner(data, layers=[200,100], metrics=accuracy)`

Then I run `learn.fit` , and get an error:

![Python traceback showing RuntimeError: Expected object of scalar type Long but got scalar type Float for argument #2 'other'](https://cdn-images-1.medium.com/max/1600/1*8q14yGDm9qNwlXmPttq-jw.png)

It looks “argument #2” in the `accuracy` function is `targs`, but it’s not obvious to me how I need to go about fixing this. I Google the error, and find a [post on it](https://forums.fast.ai/t/error-pytorch-expected-object-of-scalar-type-long-but-got-scalar-type-float-for-argument-2-other/33778/3). So yes, `targs` is “argument #2”, and I need to make my own `accuracy` function. The `accuracy` function was called when I created a learner, so I create a new cell above that one, and define a new accuracy function, called `accuracy_long` , which is identical to the original `accuracy` function, except for the`.long()` addition on the fourth line:def accuracy\_1ong(input:Tensor, targs:Tensor)->Rank0Tensor:  
   n = targs.shape\[0\]  
   input = input.argmax(dim=-1).view(n,-1)  
   targs = targs.view(n,-1).long()  
   return (input==targs).float().mean()

… and run both cells in order. It wouldn’t be any fun if we didn’t get another error, right?

![Python traceback showing NameError: name 'accuracy_long' is not defined](https://cdn-images-1.medium.com/max/1600/1*sgQRfCrfTBFJtE5XBoGBAw.png)

And I’m like “I did too define it! See, just up there?”

_\*hours of Googling and thinking I can’t even define a function and should definitely give up on coding later\*_ Look closely at what I typed up there. The ‘l’ in `accuracy_long` is a ‘1’. Cool, cool.

I give the computer a long, cold stare, then carry on recreating my learner and running `learn.fit(1, 1e-2)` . And check out my accuracy rate! It‘s strongly related to what I’d like my accuracy rate to be, in that they are exact opposites. 🙄

![Training results table showing epoch 0 with train_loss 12.24, valid_loss 9.19, and accuracy_long 0.000000](https://cdn-images-1.medium.com/max/1600/1*oUChJoXzjYGHF-jm9CplGg.png)

Since this dataset came to me pre-cleaned with a cherry on top, and was designed to predict exactly what I’m trying to use it to predict, it seems like my accuracy rate should be great, not precisely awful. So I wonder if I accidentally inverted some logic somewhere, and comb through the code. I don’t find anything, though.

Hmm. I don’t think it could be this, but I’ll try not normalizing the data? Nope, no improvement.

Unlike the Lesson 2 notebook, the Lesson 4 notebook doesn’t start the learning with fitting just one cycle over several epochs, nor does it run the learning rate finder or confusion matrix. I’ll just pop those in myself.

I create and run five new cells: `learn.fit_one_cycle(4)` , `learn.save(‘stage-1’)` , `learn.unfreeze()` , `learn.lr_find()` , and `learn.recorder.plot()` . Here’s the learning rate chart:

![Learning rate finder plot showing Loss vs Learning Rate, with loss plateauing around 8.7 then dropping steeply after 1e-2](https://cdn-images-1.medium.com/max/1600/1*Pg9c_4j6ywlyIrJ29AiQGA.png)

Looking at the chart, it doesn’t look like changing the learning rate is going to help me.

I’m officially out of ideas, so I turn to the [fast.ai forum](https://forums.fast.ai/t/lesson-4-tabular-dataset-with-0-accuracy/55822). A member responds with advice to try the RMSE (root mean squared error) technique used in Lesson 6, so I’ll pause for now and try this again after Lesson 6.

Check out the code on [GitHub](https://github.com/g0g0gadget/A-Waiter-s-Tips)!

Other posts on this topic:

Lesson 1: [Getting Started With fast.ai](https://towardsdatascience.com/getting-started-with-fast-ai-350914ee65d2)

Lesson 2: [Classifying Pregnancy Test Results](https://towardsdatascience.com/classifying-pregnancy-test-results-99adda4bca4c)!

Lesson 2 (the sequel): [Can Deep Learning Perform Better than Pigeons?](https://towardsdatascience.com/can-deep-learning-perform-better-than-pigeons-d37ef1581a2f)

Lesson 3: [10,000 Ways that Won’t Work](https://towardsdatascience.com/10-000-ways-that-wont-work-311925525cf0)

Lesson 5: [But Where Does the Pickle Go?](https://towardsdatascience.com/but-where-does-the-pickle-go-53619676bf5f)

Lesson 6: [Everybody Wants to be a Cat](https://towardsdatascience.com/everybody-wants-to-be-a-cat-6dd6190c5d9c)

* * *

I’m a mathematics lecturer at CSU East Bay, and an aspiring data scientist. Connect with me on [LinkedIn](https://linkedin.com/in/laura-langdon/), or say hi on [Twitter](https://twitter.com/laura_e_langdon).
