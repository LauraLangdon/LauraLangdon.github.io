---
title: "TIL: Semantic Linefeeds"
slug: til-semantic-linefeeds
status: draft
featured: false
date: 2026-03-15T12:00:00.000-07:00
tags:
 - "Blog"
 - "Learning in Public"
---

In the docs for the Elk Mastodon client, I came across the idea of semantic linefeeds.
When you write text using semantic linefeeds, you add a single line break after each sentence,
which makes editing and version control easier.
But those line breaks are ignored when the text is rendered, so your docs look the same as usual!

## Context

This sounded good to me, but I had trouble grokking the magic just looking at the example in the post.
Here's what helped me see it!

## What I found

This paragraph is written as I always have previously, with no line breaks between sentences:

> I cannot give you credit for any philosophy of the kind. Your retrospections must be so totally void of reproach, that the contentment arising from them is not of philosophy, but, what is much better, of innocence. But with me, it is not so. Painful recollections will intrude which cannot, which ought not, to be repelled. I have been a selfish being all my life, in practice, though not in principle. As a child I was taught what was right, but I was not taught to correct my temper. I was given good principles, but left to follow them in pride and conceit. Unfortunately an only son (for many years an only child), I was spoilt by my parents, who, though good themselves (my father, particularly, all that was benevolent and amiable), allowed, encouraged, almost taught me to be selfish and overbearing; to care for none beyond my own family circle; to think meanly of all the rest of the world; to wish at least to think meanly of their sense and worth compared with my own. Such I was, from eight to eight and twenty; and such I might still have been but for you, dearest, loveliest Elizabeth! What do I not owe you! You taught me a lesson, hard indeed at first, but most advantageous. By you, I was properly humbled. I came to you without a doubt of my reception. You showed me how insufficient were all my pretensions to please a woman worthy of being pleased.
>
> — *Pride and Prejudice* by Jane Austen, Chapter 58

And here's the same paragraph with single line breaks after each sentence:

> I cannot give you credit for any philosophy of the kind.
> Your retrospections must be so totally void of reproach, that the contentment arising from them is not of philosophy, but, what is much better, of innocence.
> But with me, it is not so.
> Painful recollections will intrude which cannot, which ought not, to be repelled.
> I have been a selfish being all my life, in practice, though not in principle.
> As a child I was taught what was right, but I was not taught to correct my temper.
> I was given good principles, but left to follow them in pride and conceit.
> Unfortunately an only son (for many years an only child), I was spoilt by my parents, who, though good themselves (my father, particularly, all that was benevolent and amiable), allowed, encouraged, almost taught me to be selfish and overbearing;
> to care for none beyond my own family circle;
> to think meanly of all the rest of the world;
> to wish at least to think meanly of their sense and worth compared with my own.
> Such I was, from eight to eight and twenty; and such I might still have been but for you, dearest, loveliest Elizabeth!
> What do I not owe you!
> You taught me a lesson, hard indeed at first, but most advantageous.
> By you, I was properly humbled.
> I came to you without a doubt of my reception.
> You showed me how insufficient were all my pretensions to please a woman worthy of being pleased.

Both of these paragraphs render exactly the same!

## Why it matters

By starting a new line at the end of each sentence, and splitting sentences themselves at natural breaks between clauses, a text file becomes far easier to edit and version control.
Text editors are very good at manipulating lines — so when each sentence is a contiguous block of lines, your editor suddenly becomes a very powerful mechanism for quickly rearranging clauses and ideas.

With every sentence and clause on its own line, you can make exactly the same change to the same paragraph without the rest of the paragraph even noticing.
