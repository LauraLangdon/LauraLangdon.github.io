---
title: "Fear Tells Us What We Have To Do"
slug: fear-tells-us-what-we-have-to-do
status: published
featured: false
date: 2019-10-14T16:04:00.000-07:00
tags:
  - "Blog"
  - "Learning in Public"
excerpt: "My deep learning self-study for 09/30/19–10/07/19"
feature_image: https://lauralangdon.io/content/images/2023/05/1_2A5ROBhoSqee1W4veJLJYw.jpg
feature_image_alt: "GIF of a digital robotic hand touching a block"
---

I’m a math lecturer and aspiring data scientist hoping to participate in artificial general intelligence research, and this week I decided to start keeping a weekly blog of what I’ve been doing, both for my own reference and potentially to help others on a similar path, following the advice of [Rachel Thomas](https://medium.com/@racheltho/why-you-yes-you-should-blog-7d2544ac1045) of fast.ai to “write the blog that would have helped you to read six months ago.”

I have an M.S. in pure math, but I don’t have much knowledge of stats, so I’m working through Khan Academy’s [“Statistics and Probability”](https://www.khanacademy.org/math/statistics-probability) course, and I’m also studying deep learning through [“Practical Deep Learning for Coders”](https://course.fast.ai/) by fast.ai. Finally, I’m using [“Python for Data Science and Machine Learning Bootcamp”](https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/) by Jose Portilla on Udemy to learn NumPy, Pandas, matplotlib, and other Python libraries for data science.

In the past few weeks, I’ve tended to focus on only one of those until I got stuck, and then jump ship to work on one of the others. For some that workflow could be productive, but I could feel myself using it to avoid the feelings of self-doubt that bubbled up when working on the hard things, and I ended up reminding myself of this quote:

![A quote image over a sunset road: "Are you paralyzed with fear? That's a good sign. Fear is good. Like self-doubt, fear is an indicator. Fear tells us what we have to do." — Steven Pressfield](https://cdn-images-1.medium.com/max/1600/1*zFY8tFrTrOc4mF-B-qC-fw.jpeg)

~Steven Pressfield, The War of Art: Break Through the Blocks & Win Your Inner Creative Battles ([https://stevenpressfield.com/books/the-war-of-art/](https://stevenpressfield.com/books/the-war-of-art/))

So last week, I set up specific learning goals for each of my courses for each week. I think it’ll be easier to avoid the two suboptimal learning behaviors I’d observed in myself: avoiding hard things altogether in favor of easier ones, or — at the other small end of the usefulness bell curve — spending _too much_ time on hard things, making zero progress on anything else. In machine learning terms, I need to literally tune my own learning rate higher to avoid getting stuck in a local minimum!

Each week, I plan to do:

*   One lesson from fast.ai
*   One unit of stats
*   0.5–1 sections of the Python course (some sections are brief, and others are full projects)
*   Read one deep or machine learning paper

When I really don’t want to work on something, I use the [Pomodoro technique](https://en.wikipedia.org/wiki/Pomodoro_Technique): I only require myself to work on it for 25 minutes, then I can stop or take a break. The first 25 minutes nearly always gets me over the emotional resistance hump, and I have an easier time keeping going after that. This technique helped me get through homework during grad school, too!

So last week, I did Lesson 4 of “Practical Deep Learning for Coders” by fast.ai, and you can read about my experience with that in detail in [Predicting a Waiter's Tips](https://towardsdatascience.com/predicting-a-waiters-tips-1990342a0d02).  
I also worked through the “Exploring Bivariate Data” and “Study Design” units on the Khan Academy stats course, learning how to calculate and interpret least-squares regression lines, and about experimental vs. observational studies.

In the “Python for Data Science and Machine Learning Bootcamp” course on Udemy, I completed Sections 5–7, reviewing the NumPy syntax I learned in the deeplearning.ai [“Deep Learning”](https://www.coursera.org/specializations/deep-learning) course on Coursera, and practicing querying data with Pandas. I’ve previously learned some SQL and hadn’t realized how much Pandas and SQL had in common. Then I started wondering when one is better to use than the other, and found this post very helpful:

> Which tool to use depends on where your data is, what you want to do with it, and what your own strengths are. If your data is already in a file format, there is no real need to use SQL for anything. If your data is coming from a database, then you should go through the following questions to understand how much you should use SQL.  
>   
> _”SQL and Pandas” (_[_https://towardsdatascience.com/sql-and-pandas-268f634a4f5d_](https://towardsdatascience.com/sql-and-pandas-268f634a4f5d)_) by Kailey Smith_

![GIF of a digital robotic hand touching a block](https://cdn-images-1.medium.com/max/1600/1*2A5ROBhoSqee1W4veJLJYw.gif)

The paper I chose to read — [“Learning Gentle Object Manipulation with Curiosity-Driven Deep Reinforcement Learning”](https://arxiv.org/abs/1903.08542) — came from [DeepMind](https://deepmind.com/), and was written by Sandy H. Huang, Martina Zambelli, Jackie Kay, Murilo F. Martins, Yuval Tassa, Patrick M. Pilarski, and Raia Hadsell. You can check out [my reading notes and questions (PDF)](https://github.com/g0g0gadget/Papers-Read/blob/master/Learning%20Gentle%20Object%20Manipulation%20With%20Curiosity-Driven%20%28notes%29...-merged.pdf). The work revolved around teaching a robot to handle objects gently, using deep reinforcement learning.

This was my first time reading a deep or machine learning paper, and it turned out to have been a fantastic choice. The overall idea is intuitive even for a layman, and even better, the [simulations and video](https://sites.google.com/view/gentlemanipulation) of the actual experiments make the methods and results simple to understand. But I still had many questions as I read, and learned a lot.

I hadn’t read much about reinforcement learning until this paper, and I didn’t understand how it would help. Rewards? Penalties? Why? Why both? I didn’t understand why a robot would need to be “rewarded” for executing a particular task, much less given a “pain penalty.” It seems obvious now that I get it, but this is really the “learning” aspect of the project: if we know ahead of time exactly the amount of force the robot should use to handle an object, we’re done here. But if we’d like to be able to have the robot handle an object it hasn’t encountered before, without our having to specify an amount of force for every action it takes, we have to have a means of letting it know when it’s gotten it right.

When an instance of the learner (the “agent”) was trained with only a reward for making contact with an object, it would frequently do so with excessive force. Training with only a penalty for excessive force, however, resulted in agents that would avoid contact with the object altogether. Taking a cue from child development research, the authors instituted a reward for an agent when it predicted the amount of force it should use _incorrectly_, and in true Goldilocks fashion, the combination of the three reward types was the winner. The agent was “curious” about the pain penalty, and motivated to explore varying amounts of force to find the one that was “just right”.

It’s difficult to convey how fun this paper was to read, and how fascinating it was to get a glimpse of how human psychology is being used to advance AI. We call it artificial “intelligence” because we explicitly understand this kind of thoughtfulness as a human endeavor, but it’s incredible to see how that’s actually implemented.

* * *

I’m a mathematics lecturer at CSU East Bay, and an aspiring data scientist. Connect with me on [LinkedIn](https://linkedin.com/in/laura-langdon/), or say hi on [Twitter](https://twitter.com/laura_e_langdon).
