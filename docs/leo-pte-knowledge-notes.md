# LEO's PTE Knowledge Base — Full Notes

**101 entries**, extracted from SmartLabs' own real PTE training documents (reading/listening/writing/speaking master notes, vocabulary lists, scoring and student guidance). This is the complete, faithful content of `pteKnowledge` — every entry that gets seeded into Firestore via `scripts/seed-pte-knowledge.js` and retrieved (by tag/topic match, not full-dump) when LEO answers a student in trainer mode. See `docs/leo-pte-trainer-plan.md` for how retrieval works, and the dashboard's **Brain** page to add to or edit this content directly.

## Contents

- [Reading](#reading) — 12 entries
- [Listening](#listening) — 11 entries
- [Writing](#writing) — 20 entries
- [Speaking](#speaking) — 29 entries
- [Vocabulary](#vocabulary) — 10 entries
- [Scoring](#scoring) — 16 entries
- [Guidance](#guidance) — 3 entries

---

## Reading

### `reading.fill-in-blanks.collocations`
**Q: What are collocations and why do they matter for Fill in the Blanks?**

A collocation is a natural word partnership that native speakers use automatically — getting the collocation wrong is a very common mistake even when grammar is technically fine. Common academic collocations: make a decision / make progress (not 'do a decision'); take responsibility / take action / take notes; conduct research / conduct an investigation; reach a conclusion / reach an agreement; raise awareness / raise questions; draw attention / draw conclusions. Watch adjective collocations too: 'strong argument' and 'strong evidence' are correct, but 'powerful evidence' is not; 'heavy rain' and 'heavy traffic' are correct, but 'strong traffic' is not.

*tags: reading, writing, collocations, fill in the blanks, word partnerships · priority: 4*

### `reading.fill-in-blanks.context-based-choice`
**Q: What do I do when more than one answer seems grammatically correct in Fill in the Blanks?**

Often the grammar is correct for multiple candidate answers in a blank — in that case, meaning decides the answer, not grammar. Always ask: 'Does this idea logically fit the context?' Example: 'Scientists ___ a new species.' Both 'discovered' and 'created' are grammatically fine, but the correct answer is 'discovered', because scientists discover species, they do not create them.

*tags: reading, fill in the blanks, meaning, context, logic · priority: 4*

### `reading.fill-in-blanks.grammar-rules`
**Q: What grammar rules matter most for Fill in the Blanks?**

Reading & Writing Fill in the Blanks is largely based on grammar, collocation, vocabulary, and meaning. Four key grammar rules: (1) Subject-verb agreement — singular subject needs a singular verb ('The student studies daily', not 'study'), plural subject needs a plural verb ('Students study daily'). (2) Tense consistency — match the time context: past ('Yesterday he went home'), present ('Every day he goes home'), future ('Tomorrow he will go home'). (3) Articles — 'a' before singular countable nouns ('a book'), 'an' before vowel sounds ('an engineer'), 'the' for a specific, already-identified noun ('the report submitted yesterday'). (4) Prepositions follow fixed patterns that must be memorised: interested in, depend on, responsible for, participate in, contribute to.

*tags: reading, writing, fill in the blanks, grammar, articles, prepositions, tense · priority: 5*

### `reading.listening.answer-order-strategy`
**Q: What should I check, in order, when I'm not sure of an answer in Reading or Listening Fill in the Blanks?**

When uncertain in Reading or Listening Fill in the Blanks, check in this order: Step 1 — grammar. Step 2 — collocation. Step 3 — logical meaning. Step 4 — paragraph flow. Step 5 — academic style. The answer that is grammatically correct, naturally collocated, logically meaningful, and contextually connected is almost always the correct PTE answer.

*tags: reading, listening, fill in the blanks, strategy, uncertain, grammar, collocation · priority: 5*

### `reading.multiple-choice.common-traps`
**Q: What are the common traps in PTE Reading multiple choice questions?**

Three common traps in Reading multiple choice: (1) Extreme words — be suspicious of options containing 'always', 'never', 'every', 'impossible', 'completely' — these are often wrong because real passages rarely make absolute claims. (2) Partially correct answers — these contain one correct idea but are overall incorrect; this is the most dangerous trap because it feels almost right. (3) Outside information — an option may be true in real life but isn't actually supported by the passage; ignore personal/general knowledge and judge options strictly by what the passage says.

*tags: reading, multiple choice, traps, extreme words, outside information · priority: 5*

### `reading.reorder-paragraphs.linking-devices`
**Q: What linking words help with Reorder Paragraphs?**

Group linking devices by function to help sequence paragraphs correctly: Addition — furthermore, moreover, additionally, besides. Contrast — however, nevertheless, on the other hand, in contrast. Result — therefore, consequently, thus, hence. Example — for example, for instance, such as. Time sequence — first, then, subsequently, finally. A sentence that opens with one of these words is signalling its relationship to the sentence before it, which tells you where it belongs in the order.

*tags: reading, reorder paragraphs, linking words, connectives, sequencing · priority: 4*

### `reading.reorder-paragraphs.pronoun-and-article-clues`
**Q: How do pronouns and 'the' help me order paragraphs correctly?**

Two reliable logic clues for Reorder Paragraphs: (1) Pronoun chains — a sentence containing 'this', 'these', 'those', 'it', or 'they' usually follows the sentence that first introduces the noun it refers to. Example: Sentence A 'Researchers developed a new vaccine.' Sentence B 'This breakthrough may save millions of lives.' A must come before B. (2) The definite article clue — when a sentence uses 'the' before a noun, that noun was probably mentioned earlier (without 'a'/'an') in an earlier sentence. Example: A 'Scientists discovered a planet.' B 'The planet appears habitable.' A comes first because B's 'the planet' refers back to A's 'a planet'.

*tags: reading, reorder paragraphs, pronouns, pronoun chains, definite article, the · priority: 4*

### `reading.reorder-paragraphs.sentence-types`
**Q: How do I identify the topic sentence in Reorder Paragraphs?**

Reorder Paragraphs is all about logic between three sentence types: Topic Sentence (the opening sentence, introduces the subject), Supporting Sentences (expand ideas from the topic sentence), and Concluding Sentence (usually the final sentence, wraps up the discussion). A topic sentence has independent meaning (can stand alone, e.g. 'Climate change is one of the most significant environmental challenges facing modern societies'), avoids pronouns like he/she/they/this/that/these/those/such (because the reader doesn't yet know what they refer to), introduces a new topic with a broad statement, and avoids referential/backward-looking terms like 'this issue', 'these findings', 'such developments', 'their impact' (since nothing has been mentioned yet). Supporting sentences use markers like 'for example'/'for instance' (examples), 'according to research'/'studies indicate' (evidence), 'additionally'/'furthermore'/'moreover' (details), 'therefore'/'consequently'/'as a result' (cause and effect). Concluding sentences often summarise key points ('Overall, these findings demonstrate...'), offer reflection ('These developments highlight...'), state the author's final opinion ('Ultimately, governments must act decisively'), state a result ('As a result, productivity improved significantly'), or point to future direction ('Future research may provide further insights into this issue').

*tags: reading, reorder paragraphs, topic sentence, supporting sentence, concluding sentence · priority: 5*

### `reading.scanning.strategy`
**Q: How do I scan a passage for specific information?**

Scanning means searching for specific information — dates, names, numbers, statistics, keywords — rather than reading for overall meaning. Read the question first, underline its keywords, then search the passage for the same or related words and read only the nearby lines. Example: for the question 'When was the organization founded?', the keyword is 'founded', so also search for its synonyms: established, started, created.

*tags: reading, scanning, keywords, search, find information · priority: 4*

### `reading.skimming.strategy`
**Q: How do I skim a reading passage?**

Skimming means reading quickly to understand the general meaning (gist) of a passage — to find the main idea, identify the topic, understand the writer's purpose, and locate each paragraph's theme. To skim: read the title, the first paragraph, the first and last sentence of each paragraph, and the conclusion. While doing this, look for repeated words, repeated concepts, the main argument, and the writer's opinion. Example: if a paragraph mentions global warming, carbon emissions, and renewable energy repeatedly, the main idea is climate change and solutions to reduce environmental damage — you don't need every detail to identify that.

*tags: reading, skimming, gist, main idea, skim · priority: 4*

### `reading.vocabulary.contextual-meaning`
**Q: How do I work out what a word means in a PTE reading passage?**

Vocabulary meaning changes depending on context, so always determine a word's meaning from the surrounding sentence rather than assuming a single fixed definition. Example: 'The bank approved the loan' — bank means financial institution. 'The children played on the river bank' — bank means the side of a river. Same word, different meaning depending on context.

*tags: reading, vocabulary, context, word meaning, contextual · priority: 3*

### `reading.vocabulary.synonyms-paraphrasing`
**Q: Why can't I find the exact word from the question in the passage?**

PTE reading questions are often paraphrased — they use synonyms of the words that appear in the passage, not the exact same words. Never search for exact words only; search for synonyms too. Common passage-to-question synonym pairs: increase→rise, reduce→decrease, important→significant, difficult→challenging, buy→purchase, help→assist, start→commence, end→conclude.

*tags: reading, synonyms, paraphrasing, vocabulary, multiple choice · priority: 4*

---

## Listening

### `listening.fill-in-blanks.strategy`
**Q: How do I approach Listening Fill in the Blanks?**

Before the audio plays, predict what type of word is needed in each blank — noun, verb, adjective, or adverb. Example: 'The company plans to ___ production.' — this needs a verb, and the correct answer is 'increase'. While listening, focus especially on collocations (e.g. 'make a decision') and grammar clues (subject-verb agreement, correct tense usage) to confirm your prediction.

*tags: listening, fill in the blanks, strategy, prediction · priority: 4*

### `listening.grammar.advanced-for-listening`
**Q: What grammar should I focus on for Listening tasks?**

Sentence structures: simple (Subject + Verb), complex (using clauses with although, because, while). Tense awareness: past tense signals a completed action, present tense signals a general fact, future tense signals a prediction. Common grammar traps to watch for while transcribing: articles (a/an/the), prepositions (in/on/at), and plurals (student vs students) — these are exactly the kind of small details Write From Dictation and Fill in the Blanks test.

*tags: listening, grammar, sentence structure, tense, traps · priority: 3*

### `listening.highlight-correct-summary.strategy`
**Q: How do I approach Highlight Correct Summary?**

Read all the answer options first, before listening. While listening, identify the topic, the key arguments, and the conclusion. Choose the option that covers ALL the major ideas of the talk — not an option that is accurate but only captures one small detail.

*tags: listening, highlight correct summary, strategy · priority: 3*

### `listening.highlight-incorrect-words.strategy`
**Q: How do I approach Highlight Incorrect Words — it's the hardest listening task for me?**

Highlight Incorrect Words is widely considered the most difficult listening task. Strategy: read the on-screen transcript ahead of/during the audio, follow it visually word by word, listen meaningfully (not just passively), and mark any word where what you hear differs from what's printed on screen. Example: transcript shows 'economic' but the audio actually says 'financial' — mark 'economic' as incorrect, since the printed word doesn't match what was actually said.

*tags: listening, highlight incorrect words, strategy, difficult · priority: 4*

### `listening.multiple-choice.strategy`
**Q: How do I approach Listening Multiple Choice questions?**

Focus on understanding the speaker's purpose, attitude, and main idea — do not focus on every single word, listen for overall meaning. Read the answer options quickly before the audio starts if possible, then listen for paraphrases of the options (not exact wording matches) and for tone shifts in the speaker's voice. Eliminate options that are clearly wrong. Trap alert: similar wording does not mean correct meaning — an option can reuse words from the audio while still being the wrong answer.

*tags: listening, multiple choice, strategy · priority: 3*

### `listening.note-taking.symbols-method`
**Q: What shorthand symbols should I use for listening note-taking?**

Active listening means analysing meaning, not just hearing — identify the main idea, supporting details, and the speaker's attitude while you listen. Use symbols instead of full sentences when taking notes: ↑ = increase, ↓ = decrease, → = leads to, w/ = with, + = positive/benefit, — = negative/problem, ? = question/problem, = = same as, ∴ = therefore/so. Common abbreviations: gov=government, env=environment, tech/edu/soc=technology/education/society. Write keywords only, never full sentences — you will fall behind the audio if you try to write complete thoughts.

*tags: listening, note taking, symbols, shorthand, abbreviations · priority: 4*

### `listening.overview.format`
**Q: What does the PTE Listening section actually test and how long does it take?**

The PTE Listening section lasts approximately 30-43 minutes and includes 8 question types. It tests: listening comprehension, note-taking, vocabulary, grammar, and spelling — understanding academic English in real-life contexts, not just hearing individual words.

*tags: listening, overview, format, duration, question types · priority: 3*

### `listening.practice.dos-and-donts`
**Q: What should I actually do (and avoid) when practising PTE Listening?**

Do: practise dictation daily, practise with different accents (British, Australian, American), use subtitles at first then remove them as you improve, try shadow listening (repeating after the audio), and focus on clarity over speed. Don't: skip daily dictation practice, write excessively long summaries, ignore spelling mistakes, or focus only on individual words instead of overall meaning. Vocabulary/paraphrasing tip: train your brain to recognise meaning, not exact words — e.g. increase can appear in the audio as rise, grow, or expand; important can appear as crucial or essential.

*tags: listening, practice, tips, vocabulary, paraphrasing · priority: 3*

### `listening.summarize-spoken-text.marks-breakdown`
**Q: How many words should my Summarize Spoken Text answer be, and how are marks split?**

One question from this section. Response should be more than 50 and fewer than 70 words (51-69 is the safe target). You get 10 minutes total; the audio plays only once, no pause/replay. Marks breakdown: Content 4 (include important information, show understanding of main ideas), Form 2 (follow the word limit), Grammar 2 (accurate structures, tenses, articles, prepositions, agreement), Vocabulary 2 (appropriate and varied), Spelling 2 (check carefully). Template: 'The lecture focused on [topic], particularly [key point 1] and [key point 2]. The speaker also discussed [key point 3], explaining that [important detail]. Furthermore, [factor] can have a significant impact on [area]. Overall, the lecture highlighted the importance of [main conclusion] in relation to [topic].' Avoid unnecessary repetition of the same keywords/phrases.

*tags: listening, summarize spoken text, sst, marks, word count · priority: 4*

### `listening.summarize-spoken-text.strategy`
**Q: How do I approach Summarize Spoken Text?**

Goal: capture the main idea, supporting points, and conclusion. Note-taking method: use abbreviations while listening — Gov=Government, Env=Environment, Edu=Education, Tech=Technology, Inc=Increase, Dec=Decrease. Structure your answer as Topic + Main Points + Conclusion, using a template like: 'The lecture discussed ___. The speaker explained ___ and highlighted ___, concluding that ___.' Response must be more than 50 and fewer than 70 words (51-69 words is the safe range), written as a coherent single paragraph — not bullet points, not all capitals. You get 10 minutes, the audio plays only once (no pause/replay). Marks breakdown: Content 4, Form 2, Grammar 2, Vocabulary 2, Spelling 2 — focus on including the important information and showing understanding of the main ideas, following the word limit, using accurate grammar (tenses, articles, prepositions, agreement), appropriate/varied vocabulary, and careful spelling. Under 40 words or over 100 words scores 0 for Form; two or more spelling errors scores 0 for spelling.

*tags: listening, summarize spoken text, sst, note taking, summary · priority: 5*

### `listening.write-from-dictation.strategy`
**Q: Why does Write From Dictation matter so much, and how do I approach it?**

Write From Dictation is considered the single most important listening task and one of the highest-scoring item types — invest serious practice time here. It simultaneously tests listening, spelling, grammar, and vocabulary. Technique: break the sentence into natural chunks while listening, e.g. 'The increasing use | of technology | is changing | the modern workplace.' Learn common grammar patterns so you can reconstruct sentences accurately: Article+Noun (the project, a company, an organization), Adjective+Noun (economic growth, global warming, scientific research), Verb+Noun (conduct research, make decisions, reach conclusions). Each correctly spelled word in the correct position earns a point; an incorrect or misspelled word earns zero for that word.

*tags: listening, write from dictation, dictation, strategy, most important, high scoring · priority: 5*

---

## Writing

### `writing.essay.academic-collocations`
**Q: What are some useful academic collocations for PTE essays?**

Common academic collocations with meaning and example: make progress (to improve/develop) — 'Many developing countries are making progress in renewable energy use.'; play a vital role (to be very important) — 'Education plays a vital role in shaping a nation's future.'; pose a threat (to create danger/risk) — 'Climate change poses a serious threat to biodiversity.'; gain knowledge (to learn) — 'Students gain knowledge through both theory and practice.'; address an issue (to deal with a problem) — 'Governments must address the issue of unemployment effectively.'; take measures (to act to achieve a result) — 'Authorities should take measures to reduce pollution.'; achieve success — 'Consistent effort is essential to achieve success in any field.'; exert influence (to have an effect) — 'Media can exert a strong influence on public opinion.'; provide insight — 'Research studies provide valuable insight into human behaviour.'; create awareness — 'Campaigns can create awareness about environmental conservation.' Use only 2-3 of these naturally per essay — don't force them in everywhere, and never reward/use overly advanced or robotic-sounding vocabulary just for its own sake.

*tags: essay, writing, collocations, academic tone, phrases · priority: 3*

### `writing.essay.band-comparison`
**Q: What's the difference between a Band 60 and a Band 85+ essay?**

Example question: 'While artificial intelligence becomes highly advanced, people can use computers to translate foreign languages. This makes learning foreign languages unnecessary. To what extent do you agree?' Band 60 (weak) sample: 'Nowadays artificial intelligence can translate many languages easily. Therefore, people do not need to learn foreign languages anymore. Translation applications help people communicate quickly and save time... In my opinion, learning languages is becoming less important because technology can do everything for us.' Why it scores low: simple/repetitive vocabulary, no counter-argument, weak idea development, no advanced grammar, very basic conclusion, limited coherence, no real argumentative depth. Band 85+ sample: 'Although artificial intelligence has significantly improved translation accuracy, learning foreign languages remains highly valuable in modern society. Language learning not only facilitates communication but also enhances cultural understanding, cognitive development, and professional opportunities. While translation software may assist individuals during travel or business interactions, it cannot fully replace emotional expression, human connection, or cultural nuance. For instance, individuals who acquire a second language often develop stronger interpersonal and analytical skills. Therefore, despite rapid technological advancement, foreign language education continues to play a crucial role globally.' Why it scores high: complex opener, advanced grammar structure, intelligent counter-argument, stronger refutation/opinion, relevant example, strong concluding link. Vocabulary upgrades: 'very important' -> 'highly valuable'; 'helps people' -> 'facilitates communication'; 'people use phones' -> 'individuals utilize technology'; 'learning is not needed' -> 'language learning remains essential'; 'many people think' -> 'it is widely acknowledged that'.

*tags: essay, writing, band 60, band 85, example, sample · priority: 3*

### `writing.essay.body-paragraphs`
**Q: How do I structure a body paragraph?**

A high-scoring body paragraph follows this flow: 1) Topic Sentence — introduces the paragraph's one central idea and tells the reader what to expect (e.g. 'Firstly, governments play the most important role in addressing climate change.'). 2) Explanation — explains why the topic sentence is true (e.g. 'They can implement environmental regulations that reduce carbon emissions nationwide.'). 3) Further development / supporting detail — develops the same idea further, don't introduce a second idea here. 4) Example — real, relevant evidence (e.g. 'For instance, many countries have reduced pollution through strict environmental policies.'). 5) Mini-conclusion / result — proves the paragraph's point and links back to the topic (e.g. 'Therefore, government intervention is essential for achieving significant environmental improvements.'). Why this scores high: clear main idea, well-developed with explanation and example, smooth flow via linking words, logical progression, strong concluding sentence. Rule: one paragraph = one main idea — don't mix ideas in a single paragraph.

*tags: essay, writing, body paragraph, topic sentence, explanation, example · priority: 5*

### `writing.essay.common-mistakes`
**Q: What mistakes should I avoid in the PTE essay?**

Biggest mistakes students make: writing too short (under 200 words), going off-topic, using very difficult or wrong vocabulary, memorizing essays word-for-word (examiners easily spot this), poor paragraphing, grammar mistakes and run-on sentences, repeating the same words, giving no examples or explanations. Other flagged issues: memorized essays, off-topic content, weak/unsupported arguments, poor structure with no clear flow (lowers the coherence score), repetitive vocabulary, and too many grammatical errors. Common thinking mistakes that cause these: trying to sound 'too smart' (makes ideas confusing and unnatural), writing without planning (weak structure, irrelevant ideas), changing opinion midway (confuses the reader, weakens the thesis), overusing memorized templates (sounds robotic), writing irrelevant examples, panicking about ideas, and focusing only on vocabulary at the expense of clarity. Simple ideas explained clearly score higher than confusing ideas.

*tags: essay, writing, mistakes, errors, avoid · priority: 4*

### `writing.essay.counter-arguments`
**Q: How do I discuss the opposing view without losing my own opinion?**

The Band 85+ method for a second body paragraph that handles the other side: state your opinion, acknowledge the other side (show you understand the opposite view), explain why it seems valid, then refute or limit it (explain its weakness, or why your view is stronger), then reaffirm your position with confidence. Example: 'Although some individuals argue that medical technology may create economic pressure due to aging populations, its overall benefits significantly outweigh the drawbacks. Advanced medical treatments have reduced mortality rates and improved the quality of life for millions of people worldwide. Consequently, medical innovation should be viewed as a major achievement rather than a social burden.' Four reusable structures: 1) Concession — 'Although [X], [Y] remains beneficial.' 2) Partial agreement — 'While this viewpoint is understandable, it overlooks the fact that [X].' 3) Contrast — 'On the other hand, some people believe [X]; however, [Y].' 4) Reaffirming — 'Despite these concerns, it is clear that [X].' High-scoring argument collocations: introducing opinions ('It is widely believed that...', 'A common argument suggests that...'), acknowledging ('While this viewpoint may seem convincing...', 'Admittedly, this overlooks the fact that...'), refuting politely ('Nevertheless, this argument fails to consider...', 'This view is limited because...'), showing impact ('This plays a crucial role in...'). A high-scoring essay never ignores the opposite side — it acknowledges it intelligently, then strengthens its own argument.

*tags: essay, writing, counter argument, opposing view, balance, concession · priority: 4*

### `writing.essay.evaluation-framework`
**Q: How would an examiner evaluate my essay in detail?**

SmartLabs' detailed essay-evaluation framework checks, in order: 1) Content Score (0-6) — did the essay fully answer the question and properly develop the thesis. 2) Structure Analysis — correct paragraph count, effective paragraph balance, follows the ideal PTE strategy (intro/body/body/conclusion). 3) Coherence & Cohesion — one central idea per paragraph, logical flow, paragraph unity, sentence connection, transition quality (and exactly where coherence breaks, if it does). 4) Thesis Development — clarity of thesis, consistency of arguments, whether body paragraphs support the thesis, whether the conclusion proves it. 5) Argumentative Quality — explanation depth, logic quality, example support, relevance, critical thinking (and which arguments are weak and how to strengthen them). 6) Vocabulary & Collocations — strong vocabulary used, natural collocations (listed and evaluated), repetitive vocabulary, awkward or memorized phrases. 7) Grammar — mistakes in grammar/punctuation, awkward sentences, lack of sentence variety (with individual corrections). 8) Estimated score out of 90. 9) Final improvement plan — top 5 weaknesses, exact sentences needing correction with improved versions, and quick strategic tips. This is the same shape of feedback a real strong trainer gives — useful as a mental checklist when reviewing a student's essay, not just when a formal score is requested.

*tags: essay, writing, evaluation, self-check, scoring criteria, rubric · priority: 3*

### `writing.essay.golden-rules`
**Q: What are the golden rules for essay writing?**

1. One paragraph = one central idea. 2. Every sentence must support the topic sentence. 3. Every paragraph must support the thesis statement. 4. The conclusion must prove the thesis. 5. Do not introduce new ideas in the conclusion. 6. Use 2-3 natural collocations (e.g. climate change, carbon emissions, renewable energy, social responsibility, mental health, economic growth, practical experience, global economy, environmental protection). 7. Use simple grammar correctly rather than difficult grammar incorrectly. 8. Do not memorize fancy vocabulary. 9. Examples must directly support the argument. 10. Always ask: 'Does every sentence help me prove my thesis?' If the answer is no, delete the sentence.

*tags: essay, writing, rules, tips, checklist · priority: 4*

### `writing.essay.introduction`
**Q: How do I write a strong essay introduction?**

Sentence 1 introduces the topic (paraphrased, not copied from the question) — e.g. 'Climate change has become one of the most serious global challenges affecting modern society.' Its purpose is to show the examiner you understand the topic. Sentence 2 is the thesis statement — the MOST IMPORTANT sentence in the essay, since everything afterward must prove it. e.g. 'Although individuals can contribute to environmental protection, I believe governments have the primary responsibility because they possess greater authority and resources.' A reusable template: '[Paraphrased topic sentence]. While some people believe that [opposing view], others think that [main view]. I [agree/disagree/partly agree] with this opinion because [reason 1], although [counter reason].' — note this template doesn't fit every essay, so don't force it onto a topic it doesn't suit.

*tags: essay, writing, introduction, thesis, opening sentence · priority: 4*

### `writing.essay.linking-words`
**Q: What linking words should I use in my essay?**

Adding ideas: furthermore, moreover, in addition, additionally, besides, similarly, likewise. Giving examples: for example, for instance, such as, to illustrate, this can be seen when. Showing cause: because, since, as, due to the fact that, owing to. Showing effect: therefore, thus, consequently, as a result, hence. Contrasting ideas: however, on the other hand, in contrast, nevertheless, whereas, although, despite this. Giving opinion: in my opinion, I believe, I think that, from my perspective, it is evident that, there is no doubt that, it can be argued that. Concluding: in conclusion, to sum up, overall, in summary, ultimately, all things considered, taking everything into account. Phrases for structuring: Introduction — 'It is often said that...', 'The issue of ___ has become increasingly significant in modern times.', 'There are both advantages and disadvantages to this trend.' Body — 'One key aspect worth considering is...', 'This can be explained by...', 'A clear example of this is...', 'On the other hand, critics argue that...' Conclusion — 'In conclusion, while there are benefits to ___, the drawbacks cannot be ignored.', 'Therefore, it is essential to find a balanced approach to...'

*tags: essay, writing, linking words, connectors, transitions · priority: 4*

### `writing.essay.predictions-2026`
**Q: What essay topics are predicted for the PTE exam?**

SmartLabs' 2026 essay prediction list (40 high-probability topics based on past trends): studying abroad advantages/disadvantages; grades vs developing individual potential; students evaluating teachers; rising unemployment causes/solutions; government vs individual responsibility for healthcare; living in the present vs worrying about the future; balanced diet vs exercise for health; teaching good citizenship vs academic subjects; academic skills vs life skills in schools; digital communication replacing face-to-face communication; government spending on public transport vs roads; the internet as blessing or curse; teaching children independence vs dependence; machines replacing human jobs; friends vs family importance; city life vs country life; building new homes in countryside vs cities; high income as the most important job factor; taxing fast food; climate change caused by human activity; medical technology increasing life expectancy — blessing or curse; cheaper public transportation advantages/problems; tourism disadvantages vs advantages for less-developed countries; penalizing late university submissions; television's usefulness; experiential learning in schools; formal written exams as the main assessment method; the value of travel being overrated; spending on historic building restoration vs modern housing; AI translation making foreign language learning unnecessary; age restrictions on activities; maximum wage for high-paying jobs; city vs countryside personal preference; celebrities/sportspeople giving up privacy as the price of fame; the most pressing global problem and its solution; students learning better by watching others. Universal essay ideas usable for almost any topic: technology improves efficiency; education drives growth; balance matters in every aspect of life; government responsibility for citizens; globalization connects people; change brings both positive and negative impacts; people must be aware of their responsibilities; innovation/research lead to a better future; public services should be accessible to everyone; every problem has a solution if people work together.

*tags: essay, writing, predictions, exam topics, 2026, practice topics · priority: 3*

### `writing.essay.scoring-criteria`
**Q: How is the PTE essay scored and how much time do I get?**

The essay is marked out of 90 and contributes to your overall PTE score. Examiners look at: Content (does it address the topic clearly and fully, with relevant ideas, examples and explanation), Coherence & Cohesion (logical organization, smooth linking words), Lexical Resource/Vocabulary (a wide range used accurately and appropriately), Grammatical Range & Accuracy (variety of sentence structures, correct grammar), Argumentative Quality (opinion supported with strong reasons and examples), and Mechanics (correct spelling, punctuation, capitalization). Remember: examiners do not look for difficult words — they look for clear ideas, strong structure, and correct usage. You get 20 minutes total: 2-3 minutes to plan, 14-16 minutes to write, 2-3 minutes to review. Word count should be 180-260 words, ideally 220-260 words (one internal guide says 220-250). Writing too little or too much can affect your score.

*tags: essay, writing, scoring, marks, time, word count, criteria · priority: 5*

### `writing.essay.structure`
**Q: What's the right essay structure?**

SmartLabs teaches a few closely related structures — pick one and use it consistently, since structure/coherence matters far more than the exact paragraph count. Strict 4-paragraph version: Paragraph 1 Introduction (2 sentences: paraphrase/introduce the topic, then a clear thesis statement giving your opinion), Paragraph 2 Body 1 (5 sentences: topic sentence, explanation, further development, example, mini-conclusion), Paragraph 3 Body 2 (5 sentences, same flow, often the opposing/second viewpoint), Paragraph 4 Conclusion (1 sentence restating the opinion). Total 13 sentences, 220-250 words. A more flexible version: Introduction (1-2 sentences: paraphrase + opinion), 2-3 Body Paragraphs (one main idea each, explained with reasons and an example), Conclusion (1-2 sentences: summarize + reiterate opinion + strong closing statement). An optional 3rd body paragraph can be added if there's a genuinely separate supporting idea. Whichever version you use: one paragraph = one central idea, every sentence must support that paragraph's topic sentence, every paragraph must support the thesis, and the conclusion must prove the thesis without introducing new ideas.

*tags: essay, writing, structure, paragraphs, format, 4-paragraph, 5-paragraph · priority: 5*

### `writing.essay.topic-vocabulary.culture-misc`
**Q: What vocabulary should I use for architecture/sports/space/art/culture essay topics?**

The Design of Buildings: architectural innovation, structural integrity, aesthetic appeal, sustainable architecture, energy-efficient design, heritage preservation. e.g. 'Modern architecture emphasizes energy-efficient design to minimize carbon emissions.' Sports Salaries: financial disparity, commercialisation of sports, celebrity endorsement, inflated wages, merit-based compensation. e.g. 'The commercialisation of sports has led to inflated salaries among top athletes.' Artificial Lighting: circadian rhythm, visual comfort, light pollution, energy consumption, sustainable lighting solutions. e.g. 'Excessive artificial lighting can disrupt the natural circadian cycle.' Ocean Exploration: marine biodiversity, oceanic ecosystems, deep-sea research, underwater robotics, environmental preservation. e.g. 'Deep-sea exploration contributes to our understanding of marine biodiversity.' Cultural Diversity: multicultural integration, intercultural communication, social harmony, inclusivity, pluralistic society. e.g. 'Cultural diversity enriches societies through mutual understanding.' Space Laws: extraterrestrial regulation, international cooperation, space governance, orbital management. e.g. 'The absence of clear space laws may lead to territorial disputes in outer space.' Traditional Art: cultural preservation, artistic heritage, indigenous craftsmanship, intangible heritage. e.g. 'Traditional art forms reflect the cultural identity of a nation.'

*tags: essay, writing, vocabulary, architecture, sports, space, art, cultural diversity, ocean · priority: 1*

### `writing.essay.topic-vocabulary.environment-health-education`
**Q: What vocabulary should I use for environment/health/education essay topics?**

Bioplastics: biodegradable materials, sustainable alternatives, petrochemical dependency, renewable feedstock, compostable packaging, circular economy, carbon neutrality. e.g. 'Bioplastics represent a sustainable alternative to petroleum-based materials.' Organic Farming: sustainable agriculture, chemical-free cultivation, soil fertility, crop rotation, pesticide-free produce, agricultural sustainability. e.g. 'Organic farming promotes environmental conservation and food safety.' Mindfulness: self-awareness, emotional regulation, cognitive clarity, stress alleviation, psychological resilience, holistic well-being. e.g. 'Mindfulness practices can enhance cognitive clarity and reduce stress.' Traditional Classroom: conventional pedagogy, face-to-face interaction, student engagement, collaborative learning, teacher-centered approach. e.g. 'The traditional classroom fosters direct communication and discipline, but it may lack technological adaptability in the modern era.' Modified Food: genetically engineered crops, agricultural biotechnology, food sustainability, nutritional enhancement, bioethics, food safety regulations. e.g. 'Genetically modified foods can enhance nutritional content and yield; however, concerns about ecological balance and long-term safety persist.' Lifestyle: sedentary habits, balanced nutrition, physical well-being, work-life equilibrium, holistic health. e.g. 'Modern sedentary lifestyles contribute to numerous health problems.'

*tags: essay, writing, vocabulary, environment, health, education, bioplastics, organic farming, mindfulness · priority: 2*

### `writing.essay.topic-vocabulary.technology-society`
**Q: What vocabulary should I use for technology/society essay topics?**

AI for Teaching: adaptive learning systems, data-driven instruction, personalized education, automated assessment, digital pedagogy, algorithmic decision-making, human-computer collaboration. e.g. 'AI-powered platforms can personalize learning based on students' cognitive levels.' / 'Overreliance on algorithmic teaching methods may reduce the role of human empathy.' Ethical Concerns: moral implications, ethical dilemma, code of conduct, integrity and accountability, corporate responsibility, transparency, whistleblowing, professional ethics. e.g. 'The use of AI in surveillance raises serious ethical dilemmas.' Cashless Transactions: digital payment systems, financial inclusion, cybersecurity threats, data privacy, fintech innovation, financial literacy. e.g. 'A cashless economy promotes financial transparency and reduces corruption, but it also raises concerns about data security and privacy breaches.' Fake News: misinformation, media manipulation, digital literacy, credibility crisis, fact-checking mechanisms, media bias. e.g. 'The spread of misinformation threatens democratic discourse. Media literacy education is vital to combat fake news propagation.' Dependence on Technology: digital dependency, automation fatigue, information overload, screen addiction, digital divide, social isolation. e.g. 'Excessive dependence on technology can lead to reduced social interaction.' Bilingual Education: linguistic competence, cognitive flexibility, second-language acquisition, cognitive advantage, global competitiveness. e.g. 'Bilingual education enhances cognitive development and employability.'

*tags: essay, writing, vocabulary, technology, society, ai, ethics, fake news, cashless · priority: 2*

### `writing.essay.vocabulary-upgrade`
**Q: How do I upgrade my essay vocabulary?**

Basic -> Better: important -> crucial/significant/essential; good -> beneficial/advantageous; bad -> harmful/detrimental/negative; many -> numerous/a large number of; people -> individuals/the public; help -> facilitate/assist/support; make -> enable/generate; because -> due to the fact that/owing to; change -> transform/alter/modify; big problem -> major concern; helps people -> enables individuals; good -> beneficial. Strong academic verbs (basic -> advanced, with example): show -> demonstrate/reveal/illustrate ('The results demonstrate a strong connection between education and income.'); help -> facilitate/promote/enhance ('Group discussions facilitate better understanding among students.'); cause -> trigger/generate/lead to ('Poor diet and lack of exercise often lead to obesity.'); change -> transform/modify/alter; use -> utilize/implement/employ; improve -> strengthen/boost/advance; need -> require/demand/necessitate; get -> obtain/acquire/gain; give -> provide/offer/grant. Positive/enhancing action words: improving, strengthening, elevating, fostering, empowering, stimulating, promoting, enhancing. Reducing/limiting action words: reducing, minimizing, mitigating, curtailing, restricting, alleviating, diminishing, curbing. Useful opposite pairs for contrast: strengthening vs undermining, elevating vs reducing, fostering vs curtailing. Tip: mix strong verbs with linking words ('Policies aim to foster innovation, while minimizing risks to the environment.'), and never repeat simple words like help/make/do — swap them from these lists.

*tags: essay, writing, vocabulary, advanced words, synonyms, verbs · priority: 3*

### `writing.grammar.comma-rules`
**Q: When should I use commas in my writing?**

A) In compound sentences: use a comma before FANBOYS joining two independent clauses ('I wanted to go for a walk, but it started to rain.'); not needed for short casual clauses ('I went and she stayed.'). B) After introductory elements: 'After the meeting, we went out for lunch.' / 'However, many students find this difficult.' / 'Because it was raining, the match was postponed.' C) In a series/list of three or more items: 'I bought apples, oranges, and bananas.' (the final comma before 'and' is the optional-but-recommended Oxford comma). D) With non-essential/parenthetical information: 'My brother, who lives in Canada, is visiting next week.' E) With direct address: 'Lisa, can you help me with this task?' F) Between coordinate adjectives of equal rank (if you can put 'and' between them, use a comma): 'It was a long, exhausting, and stressful day.' G) With dates, addresses, large numbers, and titles following a name. Common mistakes: 'He went to the park but, it started raining.' should be 'He went to the park, but it started raining.'; 'Because I was tired I went home.' should be 'Because I was tired, I went home.'; 'She bought apples oranges and bananas.' should be 'She bought apples, oranges, and bananas.'

*tags: grammar, writing, comma, punctuation, common mistakes · priority: 3*

### `writing.grammar.complex-sentences`
**Q: How do I build a complex sentence correctly?**

A complex sentence = 1 independent clause (can stand alone) + 1 or more dependent clauses (cannot stand alone), joined by a subordinating conjunction. Common subordinating conjunctions by function: cause/reason — because, since, as; contrast — although, though, even though, whereas; condition — if, unless, provided that; time — when, while, after, before, until, as soon as; place — where, wherever; purpose — so that, in order that. Two valid patterns: Pattern 1: Independent + subordinating + dependent, e.g. 'I went for a walk because it was sunny.' Pattern 2: Dependent + subordinating + Independent, e.g. 'Because it was sunny, I went for a walk.' — use a comma when the dependent clause comes first. Advanced examples: 'Although the market was volatile, investors continued to buy shares, because they trusted the long-term growth potential.' / 'Since technology evolves rapidly, professionals must continually update their skills.' Compound-complex sentences combine at least two independent clauses and one or more dependent clauses, e.g. 'Although he was exhausted, he completed the project on time, and his supervisor praised him for his dedication.'

*tags: grammar, writing, complex sentence, subordinating conjunction, dependent clause · priority: 3*

### `writing.grammar.fanboys`
**Q: What are FANBOYS and how do I use them?**

FANBOYS are the seven coordinating conjunctions that join two independent clauses: For (reason, like 'because'), And (adds information), Nor (joins two negative ideas), But (shows contrast), Or (shows choice), Yet (unexpected contrast, like 'but'), So (shows result). Structure: Independent Clause + comma + FANBOYS + Independent Clause. Example: 'I wanted to go for a walk, but it started to rain.' / 'He studied hard, so he passed the exam.' Each clause must have its own subject and verb, and a comma goes before the conjunction. No comma is needed if FANBOYS joins two very short, casual clauses (e.g. 'I went and she stayed.'). Common mistakes: 'He is tired but he continues working.' should be 'He is tired, but he continues working.' (missing comma); 'She didn't study, or she passed the exam.' is logically wrong — should be 'yet' not 'or' since it's an unexpected contrast, not a choice.

*tags: grammar, writing, fanboys, compound sentence, conjunctions, comma · priority: 4*

### `writing.grammar.sentence-types`
**Q: What are the different sentence types I should use?**

Simple sentence: one independent clause (subject + verb + complete idea). e.g. 'Technology improves communication.' Compound sentence: two independent clauses joined by a coordinating conjunction (FANBOYS). e.g. 'Technology improves communication, but it reduces face-to-face interaction.' Complex sentence: one independent clause + one or more dependent clauses (beginning with because, although, when, since, if, etc.). e.g. 'Although technology improves communication, it can reduce personal connection.' Compound-complex sentence: two or more independent clauses + one or more dependent clauses. e.g. 'Although technology improves communication, it can also isolate people, and this affects relationships.' Using a mix of these (not just simple sentences) is one of the clearest signals of strong grammatical range in PTE writing.

*tags: grammar, writing, sentence types, simple sentence, compound sentence, complex sentence · priority: 4*

---

## Speaking

### `speaking.describe-image.5-sentence-method`
**Q: What's the universal structure for Describe Image?**

The Smart Labs 5-Sentence Method works for bar charts, line graphs, pie charts, tables, maps, processes and diagrams: 1) Introduction — introduce the image type and topic. Templates: 'The given bar chart illustrates information about ___.' / 'The line graph represents data regarding ___.' / 'The table compares information related to ___.' 2) Overall trend — explain the main visual story. 'Overall, it is clear that ___ showed the most significant trend.' 3) Highest & lowest — mention the key comparison. 'While ___ recorded the highest figure, ___ showed the lowest value.' / 'The highest percentage can be seen in ___, whereas the lowest belonged to ___.' 4) Comparison/trend — describe relationships and movement. 'Compared to ___, ___ experienced a gradual increase.' / 'In contrast, ___ declined steadily, whereas ___ continued to rise.' 5) Conclusion — end confidently. 'To conclude, the image mainly highlights trends and comparisons related to ___.' / 'Overall, the chart presents useful information regarding ___.' Sample filled response (bar chart, international students by country): 'The given bar chart illustrates information about the number of international students in different countries in 2023. Overall, it is clear that the USA has the highest number of international students, while Germany has the lowest. While the USA recorded the highest figure of 70 thousand students, Germany showed the lowest value of 25 thousand. Compared to the UK, Canada and Australia have fewer international students. Similarly, the number of students decreases steadily from the USA to Germany. To conclude, the bar chart highlights clear differences in the number of international students among the five countries in 2023.' Use comparison words naturally instead of just repeating numbers, and a short, confident conclusion leaves a strong final impression.

*tags: speaking, describe image, structure, 5-sentence method, template · priority: 5*

### `speaking.describe-image.charts-structures`
**Q: What are some ready-made structures for describing charts and graphs?**

Three interchangeable structures for bar charts/line graphs/pie charts/tables — pick whichever feels natural, don't try to memorize all three: Structure 1: 1) Introduction — 'The given bar chart/line graph/pie chart/table illustrates information regarding different categories including ___ and ___.' 2) Highest & lowest — 'The highest value can be identified in ___, whereas the lowest is shown in ___.' 3) Comparison — 'Compared to ___, ___ shows an increasing/decreasing trend, while ___ recorded a similar/lower/higher value.' 4) Conclusion — 'Overall, the given image provides descriptive information regarding ___.' Focus checklist for any chart: mention the topic, mention the highest value, mention the lowest value, make one comparison, finish with a short conclusion. Worked example (tree height bar chart): 'The given bar chart illustrates information regarding the height of different tree species. It compares Hemlock, Cedar, Spruce and Douglas Fir while presenting their heights in feet. The highest value can be identified in Douglas Fir with 280 feet, whereas the lowest is shown in Hemlock with 130 feet. Compared to Cedar and Spruce, Douglas Fir shows a significantly higher height, while Hemlock recorded the lowest value. Overall, the given image provides descriptive information regarding the height of different tree species.' A cheat-sheet-style universal template: 'The given image illustrates a [type of image] related to [topic]. The data is given in percentages/numbers/years, with categories [X], [Y], [Z]. The highest value is recorded in [X], indicating a significant difference. Meanwhile, [Y] shows the lowest, whereas [Z] exhibits relatively minor changes and remains fairly stable. In conclusion, the image highlights key trends, comparisons and overall patterns in [topic].'

*tags: speaking, describe image, bar chart, line graph, pie chart, table, structures · priority: 4*

### `speaking.describe-image.diagrams-and-processes`
**Q: How do I describe a diagram or process image (e.g. Earth's structure, a life cycle, how something works)?**

Structure: 1) Introduce the topic — 'The given image illustrates [the structure of the Earth/the water cycle/the human heart/the life cycle of a butterfly, etc.]' 2) Identify the main elements — 'The image includes [inner core, outer core, mantle and crust / clouds, rain, rivers and ocean / valves, chambers, arteries and veins, etc.]' 3) Explain the diagram — 'The image shows the different parts of [X] and explains how they are connected.' 4) Conclusion — 'Overall, the image provides useful information about [X].' Sample response (Earth structure): 'The given image illustrates the structure of the Earth. The image includes the inner core, outer core, mantle and crust. The image shows the different parts of the Earth and explains how they are connected. Overall, the image provides useful information about the structure of the Earth.' Sample response (solar yard lights, a 'how it works' process diagram): 'The given image illustrates how solar yard lights work. The image includes a glass cover, solar cells, photoresistor, battery, controller board, LED and lamp cover. The image shows the different parts of a solar yard light and explains how they are connected. Overall, the image provides useful information about how solar yard lights work.' Useful phrases: illustrates/shows/explains, includes/consists of/is made up of/is divided into, represents, demonstrates, 'the different parts of', 'how they are connected', 'in a clear and organised way', 'plays an important role in'. When describing a diagram: identify the topic, mention the main elements/parts, explain how the parts connect, finish with a short conclusion — don't describe every small detail.

*tags: speaking, describe image, diagram, process, earth structure, water cycle · priority: 3*

### `speaking.describe-image.floor-plans`
**Q: How do I describe a floor plan image?**

Structure: 1) Introduce the topic — 'The given image illustrates a floor plan showing the layout of a [bedroom/apartment/house/office/dormitory/hospital/shopping mall].' 2) Mention the main areas — 'The layout includes different sections such as the [X], [Y] and [Z].' (identify only 3-5 visible areas, not every item). 3) Describe the arrangement — 'The rooms and facilities are logically arranged and connected through doors or passageways, providing easy access between different areas.' OR 'The furniture and facilities are well organised, making efficient use of the available space.' 4) Conclusion — 'Overall, the floor plan provides a clear overview of the layout and arrangement of the [building type].' Useful phrases: includes/consists of/comprises/is divided into different sections such as; is located in/at/positioned near/next to/connected through doors or passageways/adjacent to/in the centre of/on the left or right side/at the top or bottom/in the corner; well arranged/organised, makes efficient use of the available space. Sample response (university dormitory): 'The given image illustrates the floor plan of a self-catered one-bedroom dormitory at the University of Southampton. The layout includes different sections such as a bedroom, study area, living area, kitchen and bathroom. The rooms and facilities are logically arranged and connected through doors and passageways, providing easy access between different areas. Overall, the floor plan provides a clear overview of the layout and arrangement of the university dormitory.' Tips: identify the building type first, mention only 3-5 main areas, use directional words, don't describe every object/piece of furniture, keep it clear and concise.

*tags: speaking, describe image, floor plan, apartment, dormitory, layout · priority: 3*

### `speaking.describe-image.general-image-structure`
**Q: How do I describe a general photo/scene image?**

Five-part structure: (1) TOPIC — 'The given image illustrates [TOPIC/SCENE/PLACE].' (2) MAIN PEOPLE/OBJECTS — list the main visible features. (3) ACTIONS — describe what people are doing. (4) ADDITIONAL DETAILS — background/foreground features. (5) CONCLUSION — 'Overall, the image presents a clear view of [MAIN SCENE/TOPIC].' Worked example (public park): 'The given image illustrates a busy public park. The main features visible in the image include several people, trees, benches, bicycles and a walking path. In terms of activities, some people are walking along the path, while others are sitting on benches and talking. Additionally, a man can be seen riding a bicycle. In the background, several trees and buildings are visible. Overall, the image presents a lively outdoor environment.' Common mistakes to avoid: listing observations without connecting them, repeating 'we can see that' throughout, stopping too early without covering all main features, only describing one part of the image.

*tags: speaking, describe image, photo, general image, template · priority: 3*

### `speaking.describe-image.layout-map-structure`
**Q: How do I describe a layout/floor-plan map?**

Template: 'The given layout illustrates [PLACE/TOPIC], highlighting several key areas, including [A], [B] and [C]. In terms of location, [A] is situated [LOCATION], while [B] is located [LOCATION]. Additionally, [C] can be seen next to/opposite/between [D], whereas [E] is positioned [LOCATION]. Overall, the image provides a clear overview of the arrangement and location of different areas within [PLACE].' Useful location structures: 'A is located next to B, while C is situated opposite D.' / 'A is positioned between B and C.' / 'A can be seen in the centre, surrounded by B and C.' / 'A is situated on the left-hand side, whereas B is located on the right.'

*tags: speaking, describe image, layout map, floor plan, template · priority: 3*

### `speaking.describe-image.map-vocabulary`
**Q: How do I describe a world map in Describe Image?**

Template when the map shows limited labelled information: 'The given image presents a world map showing different geographical regions. Specifically, the map is divided into several areas using different colours and shades. Some regions appear lighter, whereas others are displayed in darker shades... Overall, the image provides a clear visual representation of the geographical distribution of the highlighted areas.' Template when countries/regions ARE labelled: name the regions and their colours/shades directly. Useful map vocabulary: distribution, geographical distribution, distributed across, spread across, concentrated in, mainly located in, found in, observed in, covers, located across, majority, minority, significant, approximately, relatively, predominantly, continent, country, region, northern/southern/eastern/western/central, coastal, worldwide, globally. Caution: never interpret a darker or lighter colour as a higher or lower value unless the legend explicitly tells you what the colours represent.

*tags: speaking, describe image, world map, map, vocabulary · priority: 3*

### `speaking.describe-image.maps-and-simple-images`
**Q: How do I describe a map, floor plan, or simple diagram?**

For low-detail images (maps/floor plans, old-vs-new comparisons, process diagrams), you don't need complex analysis, just confident observation. The 5-sentence method still applies: 1) Introduction — 'The given image illustrates the layout of ___.' / 'The map shows different locations and their arrangement.' 2) Overall view — 'Overall, the image highlights the arrangement of different sections and features.' 3) Key features & positions — 'The bedroom is located on the left side of the apartment. The living room can be seen next to the kitchen.' 4) Relationship/comparison — 'Compared to the bathroom, the living room appears larger. Different rooms are connected conveniently.' 5) Conclusion — 'To conclude, the image provides a clear understanding of the layout and organization.' Useful position/direction/relationship words: next to, near, between, opposite, beside, behind, in front of, connected to, linked, left/right, top/bottom, center, north/south/east/west, arranged, organized, structured. For process diagrams (e.g. oxbow lake formation), focus on stages, movement and sequence rather than static positions. What high scorers do: focus on the overall visual story, use simple but meaningful sentences, describe relationships naturally, maintain fluency even if details are unclear, keep speaking continuously and confidently. Common mistakes: reading every label, explaining unnecessary tiny details, panicking when there are no numbers, speaking in disconnected keywords, stopping midway from confusion.

*tags: speaking, describe image, maps, floor plan, process diagram, position words · priority: 4*

### `speaking.describe-image.overview`
**Q: What is Describe Image and how is it scored?**

Describe Image is one of the most important question types in PTE Academic — you'll get 4-5 questions in the exam. You analyze an image and describe the most important information clearly and fluently within a limited time. Scoring weight: around 15% of the overall PTE score, nearly one-third of the Speaking module, approximately 28 marks out of 90 for Speaking. Timing: 25 seconds to prepare, 40 seconds to speak — but the best approach is to speak confidently for only 25-35 seconds; that's enough to score high. Image types you may get: bar charts, line graphs, pie charts, tables, maps, processes, diagrams, combination charts. According to Pearson's own scoring criteria, your response should demonstrate: clear and accurate description of the image, explanation of important relationships and visible features, use of meaningful and organized sentences, and a response that helps the listener understand the main visual story of the image. Remember: Describe Image is NOT a knowledge test — it is mainly a fluency and organization test. Golden rule: high scorers summarize, low scorers read out numbers. Common mistakes: trying to describe every detail, reading all the numbers from the image, speaking for too long, panicking on a difficult image, using memorized robotic templates, losing fluency from overthinking. Your goal is to explain the main visual story naturally and confidently — focus on the main picture, not every detail.

*tags: speaking, describe image, overview, scoring weight, pearson · priority: 5*

### `speaking.describe-image.pictures-and-scenes`
**Q: How do I describe a real picture or scene image?**

Structure: 1) Introduce the topic — 'The given image illustrates [road safety/healthy lifestyle/correct posture/recycling, etc.]' 2) Identify the main objects/people — 'The image includes [people/vehicles/books/machines/signs, etc.] and [...]' 3) Describe the main action or comparison — 'The image demonstrates ___. It compares ___ with ___ and highlights ___.' (e.g. correct vs incorrect, safe vs unsafe, before vs after) 4) Conclusion — 'Overall, the image provides useful information about [safety awareness/good habits/environmental protection, etc.]' Sample response (correct vs incorrect keyboard posture): 'The given image illustrates the correct and incorrect hand positions for using a computer keyboard. The image includes hands, a keyboard and posture guidelines. It compares the correct keyboard posture with incorrect hand positions, highlighting the importance of maintaining proper wrist alignment while typing. Overall, the image provides useful guidance on correct keyboard usage and ergonomic posture.' Cheat-sheet picture template with blanks: 'The image shows [scene/place]. In the center, [main subject] is seen [action], which appears to be [purpose]. On the left/right, [X] is visible, while in the background, [Y] can be observed. The main focus is on [X], whereas [Y] appears less prominent, indicating a slight difference. Overall, the image shows [overall idea/activity].' Note: do not describe every small detail — focus only on the main idea of the image.

*tags: speaking, describe image, picture, scene, real image · priority: 3*

### `speaking.describe-image.predictions.business-and-global-data`
**Q: Can you show me real exam examples of business/comparison bar-chart describe-image questions?**

Real PTE exam questions with model answers: Global Patent Battle (bar chart) — 'The given bar chart compares international patent applications by major technology companies in 2015 and 2014. Huawei from China leads in 2015 with 3,898 applications, compared with around 3,442 in 2014. Qualcomm from the United States follows with 2,442 applications, while ZTE records 2,155. Overall, Huawei has the highest number of applications, showing the strong position of Chinese technology companies.' Tricky pronunciations: Patent (PAT-uhnt), Huawei (HWAH-way). Chocolate Consumption by country — Switzerland highest (19.8 lb/person), Germany 17.4, Ireland/UK both 16.3, France lowest (9.3) just below the US (9.5); 'overall, European countries dominate the ranking.' Computers Then and Now (comparison image) — old computer large with several controls, modern computer compact with screen/keyboard/tower; 'the image highlights how computer design has changed over time.' Inbound Visitors to Australia (table, 2014 & 2016) — New Zealand highest both years (1099k, 1115k), Germany lowest 2016 (610k); UK increased, Japan declined most. Australia's overseas-born population by country of birth (2013/2018/2023) — India highest in 2023 (~850,000), China ~650,000, Philippines ~400,000, Sri Lanka also shown; 'substantial growth... in several Asian countries.' Honey Production map of Mexico — four percentage bands (0-1% up to 10-16.38%), darkest/highest concentrated in central and eastern Mexico, lighter in the north.

*tags: speaking, describe image, predictions, bar chart, patents, chocolate, exam question · priority: 2*

### `speaking.describe-image.predictions.earth-and-geography`
**Q: Can you show me real exam examples of Earth-structure or geography describe-image questions?**

These are real PTE exam questions with model answers (25-35 second responses): Earth Structure (lower mantle focus) — 'The given diagram illustrates the internal structure of the Earth, with a focus on the lower mantle. The crust is shown at the surface and is labelled up to 100 kilometres thick. Beneath it are the upper and lower mantle. The liquid outer core begins at around 2,900 kilometres, while the solid inner core starts at about 5,100 kilometres. Overall, the diagram shows the layers extending towards the centre.' Earth Structure (four layers) — crust ~8-40km, mantle ~2,900km, outer core ~2,250km thick, inner core ~1,300km radius; 'Overall, the image shows the Earth's layered structure.' Earth Layers and Sea Level — sea level at the surface, mantle below the crust, outer core surrounding the inner core at the centre, different colours per layer. Formation of Icebergs — 'The given diagram illustrates the formation of icebergs from an ice sheet. Snow accumulates on land and forms a large sheet of ice, which moves towards the ocean. The ice crosses the grounding line and becomes a floating ice shelf. Warm ocean water causes melting beneath the shelf, and pieces of ice eventually break away as icebergs.' Icebergs in the Sea (melting process) — ice breaks from a glacier, is transported by ocean currents, melts progressively from sunlight/warmth, eventually disappears. Oxbow Lake formation — a meander (river bend) erodes a narrow neck, deposition blocks the old channel, the abandoned bend becomes an oxbow lake. Tricky word pronunciations worth knowing: Mantle (MAN-tul), Core (kor), Glacier (GLAY-sher), Approximately — just say 'about'.

*tags: speaking, describe image, predictions, earth structure, icebergs, exam question · priority: 2*

### `speaking.describe-image.predictions.population-and-demographics`
**Q: Can you show me real exam examples of population/demographic describe-image questions?**

Real PTE exam questions with model answers: China Age Groups (population pyramid, 2016) — 'The given population pyramid illustrates information regarding the population distribution of China by age and sex in 2016. It presents the male population on the left and the female population on the right across different age groups. Both males and females are highest in the 25-29 age group; both are lowest in the 100+ age group. The younger and working-age population (15-59) is much larger than the older population (60+), and males slightly outnumber females in most younger age groups.' Poverty Rates by Age and Gender (2012) — under 18: 22.3% female/21.3% male; age 18-64: 15.4%/11.9%; age 65+: 11%/6.6%; 'females have higher poverty rates in every age group.' Australia Population Age Groups — age 20-39 is largest (14.8% female/15% male), age 80+ smallest (1.9%/1.1%); 'younger adults form a larger share.' France and India Age Groups (comparison) — India has a much wider base (youngest groups ~6% each gender) vs France's more balanced pyramid; 'India has a younger population structure than France.' World Population (pie chart) — China 18.47%, India 17.86%, USA 4.34%, Indonesia 3.51%, other countries 40.32% combined. General template for population pyramids: introduce (topic, country, year), highest/lowest age groups, one comparison (working-age vs elderly, or male vs female pattern), conclusion.

*tags: speaking, describe image, predictions, population pyramid, demographics, exam question · priority: 2*

### `speaking.describe-image.process-flowchart-structure`
**Q: How do I describe a process diagram or flowchart?**

Template: 'The given flowchart illustrates the process of [TOPIC], which consists of several stages. The process begins with [STAGE 1], followed by [STAGE 2] and [STAGE 3]. In the next stage, [STAGE 4] takes place, which leads to [STAGE 5]. Subsequently, [STAGE 6] occurs before reaching [STAGE 7]. Finally, the process ends with [FINAL STAGE/OUTCOME]. Overall, the diagram provides a clear overview of the entire process from [STARTING POINT] to [FINAL OUTCOME].' Easy sentence patterns: 'A is followed by B.' / 'A leads to B, which then results in C.' / 'Following this, the process moves to D.' / 'At this point, the process is divided into A and B.' / 'The process concludes with D.'

*tags: speaking, describe image, process diagram, flowchart, template · priority: 3*

### `speaking.describe-image.structures`
**Q: What's the structure for describing a bar chart, line graph, pie chart, or table?**

First identify the image type, then use the most suitable structure — don't force one template onto every image. Four-sentence structure for bar/pie/line/table: (1) TOPIC — 'The given bar graph illustrates [TOPIC], with the main categories including [CATEGORY 1] and [CATEGORY 2], measured in [units].' (2) HIGHEST & LOWEST — state which category records the highest and lowest figures. (3) ADDITIONAL COMPARISON — note a similar pattern between two categories, or compare two specific values directly. (4) CONCLUSION — 'Overall, the graph shows noticeable differences among the given categories.' Useful comparison phrases: 'X stands at ___, compared with ___ for Y'; 'X records ___, while Y accounts for ___'; 'X is slightly higher than Y, at ___ and ___ respectively'; 'X is nearly twice as high as Y'; 'X has the highest figure at ___, followed by Y at ___.' Don't waste speaking time reading out every single number — select the most useful figures and comparisons only.

*tags: speaking, describe image, bar chart, line graph, pie chart, table, template · priority: 5*

### `speaking.describe-image.world-maps`
**Q: How do I describe a world map image?**

Before speaking, identify the map type: world map without data labels, world map with data (e.g. a heat-map by shading), or a flow map. Once you know the type, the right vocabulary becomes much easier. Smart approach: identify the overall trend, focus on regions (not individual countries), compare high vs low areas, use general language, keep it fluent. 5-sentence structure for world maps: 1) Introduction — 'The given world map illustrates [topic] across different regions.' 2) Overall trend — 'Overall, [region] appears to have the highest [X]. Darker regions indicate higher concentration.' 3) Key observations — name specific standout regions/countries. 4) Comparison — 'Compared to [low region], [high region] appears significantly more [X]. In contrast, lighter regions indicate lower [X].' 5) Conclusion — 'To conclude, the map highlights [X] across various regions of the world.' Useful vocabulary: describing density (high, low, concentrated, dense, crowded, sparse, spread out), describing patterns (distribution, variation, concentration, difference, region, trend, pattern). Do: focus on overall trend first, describe major regions not every country, compare high/low areas, use general accurate language, stay fluent. Avoid: reading every country label, giving exact numbers not shown on the map, long pauses, disconnected words, over-explaining small details.

*tags: speaking, describe image, world map, population density, regions · priority: 3*

### `speaking.read-aloud.basics`
Usually around 5-6 Read Aloud questions, generally short/manageable passages. You get about 35 seconds to prepare before the recording begins, then about 40-45 seconds to read the passage aloud. No separate content marks — you're reading text already given to you, so performance depends mainly on Oral Fluency and Pronunciation. Focus on smooth, natural delivery rather than speed; avoid unnecessary pauses, hesitations, repetitions, self-corrections. Use prep time to spot difficult words, punctuation, and good places to pause. Read in meaningful phrases — clear pronunciation plus steady fluency matters more than rushing.

*tags: speaking, read aloud, basics, timing, fluency · priority: 4*

### `speaking.repeat-sentence.basics`
Usually 10-12 Repeat Sentence questions — a major contributor to overall performance since it counts toward both Speaking and Listening, so it deserves serious practice time. Each sentence plays only once, no pause/replay. Start speaking promptly after the beep. Try to repeat exactly what you heard, same words and order. Never add extra words or filler phrases ('something like that', 'I think', 'I'm not sure'). Scored on Content, Oral Fluency, Pronunciation. Even if you can't remember the whole sentence, repeat as much accurate content as you captured, clearly and confidently — don't sacrifice fluency by inventing words to fill gaps.

*tags: speaking, repeat sentence, basics, tips · priority: 4*

### `speaking.retell-lecture.key-phrase-technique`
**Q: How do I take notes during Retell Lecture?**

The most important skill in Retell Lecture is capturing meaningful key phrases connected to the lecture topic — a key phrase is a short, meaningful group of words that summarizes an important idea. Good key phrases are specific and topic-related, e.g. for a lecture on Environmental Protection Policies: 'government environmental regulations', 'climate change reduction strategies', 'renewable energy implementation'. Bad key phrases are too general: 'general public', 'many people', 'different things', 'big problem'. The AI scoring system checks whether your response contains meaningful topic-related phrases connected to the lecture. The '5 seconds listening - 5 seconds writing' technique: listen carefully for about 5 seconds, stop listening and quickly write key phrases, listen again for the next 5 seconds, repeat throughout the lecture. DO: focus on meaningful topic-related phrases, write short key phrases not full sentences, use simple vocabulary, stay calm if you miss something and keep listening, use abbreviations/symbols, organize notes logically. DON'T: try to write every word, obsess over difficult vocabulary, panic after missing information, write long sentences while listening, worry about spelling/grammar while taking notes.

*tags: speaking, retell lecture, key phrases, note taking, 5-5 technique · priority: 4*

### `speaking.retell-lecture.overview`
**Q: What is Retell Lecture and how is it scored?**

Retell Lecture scores both your Listening and Speaking components and contributes to your overall PTE score — approximately 6% of the overall score, and 18-22% of the total within its combined listening+speaking weighting. It evaluates listening ability, speaking fluency, pronunciation, and content organization together. High scores are NOT achieved by memorizing the lecture word-for-word — the key is listening for meaningful ideas and capturing key phrases that summarize the main points. The lecture usually follows this structure: introduction/topic overview, key points/main ideas, supporting details/examples, impact/importance, and a conclusion (listen for structure clue words like 'first', 'next', 'however', 'in conclusion'). High-scoring students focus on: listening for meaningful ideas, capturing key phrases, speaking clearly and naturally, maintaining smooth fluency, and organizing ideas logically. It is not a memory test — it measures how effectively you identify important information and communicate it clearly.

*tags: speaking, retell lecture, listening, overview, scoring weight · priority: 5*

### `speaking.retell-lecture.sample-responses`
**Q: Can you show me an example Retell Lecture response?**

Example 1 — Topic: The Benefits of Regular Exercise. Key phrases: improves heart health, stronger muscles, better mood/less stress, more energy daily, helps sleep better, reduce risk of diseases, healthy lifestyle/long life. Sample response: 'The lecture explains that regular exercise has many benefits. It improves heart health and makes muscles stronger. It also helps to reduce stress and improves mood. People get more energy in their daily life and can sleep better. Regular exercise reduces the risk of many diseases and helps maintain a healthy lifestyle for a longer life.' Example 2 — Topic: The Impact of Technology on Education. Key phrases: easy access to information, online learning platforms, saves time/flexible, interactive tools, improves communication, digital skills important, challenges/distraction, need balance. Sample response: 'The lecture discusses how technology has a big impact on education. It provides easy access to information through online learning platforms and saves time because students can learn flexibly. Interactive tools make learning more engaging and improve communication. Technology also helps develop important digital skills. However, there are challenges like distractions, so a good balance is necessary.' General template structure: 'The lecture mainly discusses [topic]. The speaker highlights important aspects such as [point 1] and [point 2]. Furthermore, it explains that [point 3] has a significant impact on [X]. Finally, the speaker concludes that [Y] plays an important role in [Z].'

*tags: speaking, retell lecture, example, sample response, template · priority: 3*

### `speaking.retell-lecture.speaking-tips`
**Q: How should I actually speak during Retell Lecture?**

Speak clearly and confidently, maintain natural rhythm and flow, avoid long pauses, use proper intonation, don't speak too fast, don't repeat the same key phrases, stay focused on the topic, give a complete and well-structured response. Fluency, clarity, and meaningful content are the keys to a high score. Golden rules: listen actively and capture key ideas; use short and meaningful key phrases; speak fluently with good pronunciation; stay on topic and cover all main points; practice regularly to improve speed and accuracy.

*tags: speaking, retell lecture, fluency, tips, golden rules · priority: 3*

### `speaking.retell-lecture.templates`
**Q: Is there a template for Retell Lecture?**

Usually 2-3 questions. The audio plays once, no pause/replay — focus on main ideas and key phrases, not every word. After the audio, you get 10 seconds to organise (not invent new content), then up to 40 seconds to respond — a clear, well-organised shorter answer beats a padded full-length one. Template: 'The lecture mainly focused on [topic]. The key areas mentioned were [point 1] and [point 2], and the speaker also discussed [point 3]. Additionally, he highlighted that [factor 1], as well as [factor 2], can have a significant impact on [area/topic]. Finally, he concluded by stating that [final idea] has a direct link to [topic].' Example (climate change topic): 'The topic was about climate change. The speaker mainly discussed rising global temperatures and increasing carbon emissions. He mentioned the use of fossil fuels and rapid deforestation as major causes. Additionally, extreme weather conditions, rising sea levels and environmental damage were highlighted. Finally, the speaker emphasized renewable energy, government policies and individual responsibility as important solutions to reduce the effects of climate change.'

*tags: speaking, retell lecture, template, structure · priority: 4*

### `speaking.retell-lecture.timing-and-process`
**Q: What's the exact process and timing for Retell Lecture?**

You hear an audio lecture lasting around 60-90 seconds, only once — you cannot pause or replay it. While listening, write down key phrases quickly. After the audio ends you get 10 seconds to prepare/organize your thoughts, then a beep sounds, then you have 40 seconds to speak summarizing the lecture in your own words. You do NOT need to speak for the full 40 seconds — the ideal speaking time is around 25-30 seconds; focus on quality, not quantity. Shorter, clearer, more natural responses score higher. Stay on topic, speak naturally and fluently — good pronunciation and sentence flow improve your score. What examiners focus on: listening comprehension, key-phrase capturing, speaking fluency, pronunciation and clarity, content organization.

*tags: speaking, retell lecture, timing, process, steps · priority: 4*

### `speaking.summarize-group-discussion.mistakes-and-tips`
**Q: What mistakes should I avoid in Summarize Group Discussion?**

Common mistakes to avoid: speaking too long (over 90 seconds), missing one or more speakers, repeating the exact words from the audio instead of paraphrasing, adding your own ideas or opinions (don't — just summarize what was said), poor structure, hesitation and unclear pronunciation. Tips for success: listen actively and understand the main ideas, note down key points while listening, organize your response logically, use relationship words naturally, speak clearly/confidently/fluently, keep your answer focused and to the point. Remember: good listening + smart note-taking + clear structure + fluent speaking = high score. Cover all three speakers, mention relationships naturally, use your own words, focus on key ideas only, aim for 50-70 seconds.

*tags: speaking, summarize group discussion, mistakes, tips · priority: 3*

### `speaking.summarize-group-discussion.overview`
**Q: What is Summarize Group Discussion and how is it scored?**

In this task you hear a conversation between three speakers on an academic topic (audio length around 2-3 minutes) and must summarize the discussion in your own words, covering all three speakers' main ideas and how they relate (agree/disagree/add). Scoring contribution: about 9% of your overall score, 19% of the Speaking component, and 20% of the Listening component. Speaking time is around 50-70 seconds. What the AI looks for: Relevance (include the important points from the discussion), All Speakers Covered (mention the main ideas from all three speakers), Relationships (show how speakers agree, disagree, or add to each other's ideas), Organization (present ideas in a clear, logical order), Own Words (paraphrase naturally, avoid repeating exact sentences from the audio), Fluency (speak smoothly with clear pronunciation and natural rhythm).

*tags: speaking, summarize group discussion, sgd, overview, scoring weight · priority: 5*

### `speaking.summarize-group-discussion.sample-response`
**Q: Can you show me a sample Summarize Group Discussion response?**

Topic: online learning, three speakers. 'In the group discussion, three speakers expressed their opinions regarding online learning. Each speaker presented different viewpoints related to the topic. The first speaker mentioned that flexibility, accessibility, and time management were important advantages of online learning. He further highlighted that students can study from anywhere and access learning materials easily. The speaker also pointed out that online education saves travel time and cost. The second speaker disagreed with the first speaker and pointed out that online learning reduces face-to-face interaction. He further mentioned that students can easily get distracted at home. Moreover, the speaker highlighted that practical subjects are difficult to learn through online platforms. Whereas, the third speaker had a balanced opinion regarding the topic. The speaker highlighted that blended learning can be a better solution. He also mentioned that combining technology with classroom teaching improves engagement and learning outcomes. Overall, the discussion was a well-rounded discussion about online learning where all three speakers presented different viewpoints and perspectives regarding the topic.'

*tags: speaking, summarize group discussion, example, sample, online learning · priority: 2*

### `speaking.summarize-group-discussion.structure`
**Q: What's a good response structure for Summarize Group Discussion?**

SGD contributes to both Speaking and Listening, scored mainly on Content, Pronunciation, Oral Fluency. You hear a roughly 2-minute, 3-speaker discussion only once — note-taking is critical. What to include: the main topic, the main points from all three speakers (not just one or two), and the relationships between speakers (agree, add to, support, or disagree). Recommended flow: Topic → Speaker 1 → Speaker 2 + relationship to Speaker 1 → Speaker 3 + relationship → overall summary. Structure template: 'The speakers discussed [main topic] and shared different views regarding the issue. The first speaker said that [main point]... The second speaker added that [main point]. The speaker agreed with the first speaker and said that [agreement]. However, the speaker also mentioned [different point]. The third speaker pointed out that [main point] and added that [supporting detail]... Overall, the speakers discussed [topic], focusing mainly on [key idea 1], [key idea 2] and [key idea 3].' Sound natural — explain it the way you'd actually tell a friend what three people discussed and how their ideas connected, not like a transcript.

*tags: speaking, summarize group discussion, sgd, template, structure · priority: 4*

### `speaking.summarize-group-discussion.template`
**Q: What template should I use for Summarize Group Discussion?**

Response structure: Introduction — 'In the group discussion, three speakers expressed their opinions regarding [topic]. Each speaker presented different viewpoints and ideas related to the discussion.' Speaker 1 — 'The first speaker mentioned that [point] and [point] were important points related to the topic. He further highlighted that [point]. The speaker also pointed out that [point].' Speaker 2 — 'The second speaker either agreed or disagreed with the first speaker and pointed out that [point]. He further mentioned that [point]. Moreover, the speaker highlighted [point].' Speaker 3 — 'Whereas, the third speaker had a neutral opinion/another perspective/disagreement regarding the topic. The speaker highlighted that [point]. He also mentioned that [point].' Conclusion — 'Finally, the speaker concluded by saying [point]. Overall, the discussion was a well-rounded discussion about the topic where all three speakers presented different viewpoints, ideas, and perspectives regarding the issue.' Useful phrase bank by function: introducing ideas (mentioned that, stated that, explained that, discussed that); adding ideas (further added, furthermore, moreover, additionally); highlighting (highlighted that, emphasized that, pointed out that); agreement (agreed that, supported the idea that, similarly mentioned); disagreement (disagreed that, argued against, had an opposite opinion); another view (had another perspective, presented a neutral opinion); concluding (finally concluded, overall stated, to sum up).

*tags: speaking, summarize group discussion, template, phrases, structure · priority: 4*

---

## Vocabulary

### `vocabulary.band8.advantages-disadvantages`
Precise language for pros and cons: benefit, advantage (positive aspects); drawback, disadvantage, limitation (negative aspects); risk, opportunity (potential outcomes); challenge (difficulties); positive impact, negative impact (succinct effect description).

*tags: vocabulary, band 8, advantages, disadvantages, pros and cons, word list · priority: 3*

### `vocabulary.band8.cause-effect`
Phrases connecting actions to results: therefore, consequently, as a result (directly link cause and effect); hence, due to, because of (explain the reason behind something); lead to, result in, contribute to, trigger (show how actions create consequences).

*tags: vocabulary, band 8, cause and effect, linking words, word list · priority: 3*

### `vocabulary.band8.change-development`
Verbs for describing positive transformations, from smaller to larger scale change: enhance, improve (making something better); transform, develop, expand (larger-scale change); evolve, progress, advance, modernize, upgrade (movement forward over time).

*tags: vocabulary, band 8, change, development, word list · priority: 3*

### `vocabulary.band8.education-topic`
Essential vocabulary for discussing education topics (common in Essay, SGD, Retell Lecture): curriculum, academic performance, practical skills, higher education, qualification, knowledge, training, assessment, learning environment, critical thinking.

*tags: vocabulary, band 8, education, topic vocabulary, word list · priority: 3*

### `vocabulary.band8.environment-global-issues`
Key terms for environmental/global-issue topics: climate change, pollution, renewable energy, sustainable, natural resources, environmental protection, conservation, global warming, waste management, eco-friendly.

*tags: vocabulary, band 8, environment, climate change, topic vocabulary, word list · priority: 3*

### `vocabulary.band8.frequency-degree`
Words for precision around how often or how much: frequently, occasionally (common occurrences); rarely (uncommon events); gradually, rapidly (speed of change); significantly, slightly, completely, highly, extremely (degree to which something is present).

*tags: vocabulary, band 8, frequency, degree, word list · priority: 2*

### `vocabulary.band8.importance-impact`
Words for expressing the essential nature of an idea: vital, significant, paramount, fundamental, influential, meaningful, considerable, profound. Use these to show you understand what truly matters in an argument, not just that something is 'important'.

*tags: vocabulary, band 8, importance, impact, word list · priority: 3*

### `vocabulary.band8.opinion-argument`
Phrases for expressing a viewpoint with confidence, useful in Essay and Describe Image: 'I believe' / 'in my opinion' (personalize your stance); 'from my perspective' (a unique viewpoint); 'it is widely believed' / 'it is evident that' (common viewpoints); 'there is no doubt' / 'I strongly agree' / 'I partially agree' (clarify conviction); 'this suggests that' / 'this indicates' (evidence-based insight).

*tags: vocabulary, band 8, opinion, argument, essay, word list · priority: 3*

### `vocabulary.band8.technology-society`
Critical vocabulary for technology/society topics: technology, innovation, automation (technical advancement); artificial intelligence, digital communication, social media, online platforms, cybersecurity, data privacy, global connectivity (impact of technology on society).

*tags: vocabulary, band 8, technology, society, topic vocabulary, word list · priority: 3*

### `vocabulary.band8.work-lifestyle`
Vocabulary for discussing modern work dynamics: work-life balance, job satisfaction, career growth, professional development, productivity, workplace, income, employment, unemployment, financial stability.

*tags: vocabulary, band 8, work, lifestyle, topic vocabulary, word list · priority: 3*

---

## Scoring

### `scoring.gatekeepers.content-and-form`
**Q: Why did I get a zero on my essay even though my grammar was fine?**

For extended Speaking and Writing responses, Content and Form act as 'gatekeepers'. If a response scores 0 for Content or 0 for Form, it receives ZERO points for the ENTIRE question — no other trait score (grammar, vocabulary, spelling, etc.) matters once this happens. Examples of automatic zero: an essay written on a completely different topic from the prompt (0 for Content); an essay under 120 words (0 for Form, since Write Essay needs 200-300 words, with 120-199 or 301-380 scoring partial credit and anything outside that range scoring 0); a response that relies heavily on pre-prepared/memorised material instead of actually addressing the prompt (0 for Content). This is why word count and genuinely answering the actual prompt matter more than almost anything else.

*tags: scoring, gatekeeper, content, form, zero score, essay, swt · priority: 5*

### `scoring.misconceptions.common-myths`
**Q: What are the most common misunderstandings about PTE scoring?**

Myth 1: 'My Overall score is the average of my 4 skill scores.' FALSE — Overall is calculated independently across ALL questions; a test-taker can score 90 Overall with 69 in Reading. Myth 2: 'If I score 90 Overall, all my skill scores must be 90.' FALSE — you can achieve 90 Overall with especially strong performance on the highest-weighted questions without hitting 90 in every single skill. Myth 3: 'The Skills Profile bars show my actual score.' FALSE — the Skills Profile only shows relative strengths/weaknesses as a diagnostic tool; a full bar does not mean 90, and a 90 score doesn't guarantee a full bar. Myth 4: 'I can predict my exact score from the weighting table.' FALSE — the model also factors in question difficulty, so weightings alone can't calculate a score. Myth 5: 'If my score changes after a rescore, the original score was wrong.' FALSE — rescore differences reflect normal variation in human judgment across many extended responses; the original AI+human scoring is still considered accurate. Myth 6: 'Incorrect answers make you lose points below zero.' FALSE — the lowest possible score for any single question is zero; in 'select all that apply' style questions you lose a point per wrong option chosen but the total for that question never goes negative.

*tags: scoring, myths, misconceptions, overall score, skills profile · priority: 4*

### `scoring.overview.how-scoring-works`
**Q: How is my PTE Overall score actually calculated?**

PTE Academic combines automated scoring with expert human assessment. It reports an Overall score (10-90) and four communicative skill scores — Listening, Reading, Speaking, Writing (10-90 each). Test takers complete 65-75 questions; each is scored either correct/incorrect (1 point or 0) or on partial credit (a range of points based on response quality). The scoring model is NOT a simple sum of question points — it uses three inputs: (1) question scores — the points achieved, (2) question difficulty — determined through extensive pre-testing, which allows fair comparison even though every test-taker gets a different set of questions, and (3) question weighting — how much each question type contributes to each score, designed to reflect real-world communication importance. The Overall score and each skill score are calculated independently of each other, based on all the questions relevant to that score — the Overall score is NOT an average of the four skill scores, which is the single most common misunderstanding about PTE scoring.

*tags: scoring, overall score, how pte is scored, score calculation · priority: 5*

### `scoring.rescore.process`
**Q: How does a PTE rescore actually work, and should I request one?**

If a candidate requests a rescore, the ENTIRE test's open-ended responses are re-evaluated, entirely by human raters (unlike the original scoring, which combines automation with human evaluation). Each extended response is independently reviewed by two human raters; if they disagree, a third expert rater adjudicates. Multiple-choice/closed questions with definitive correct answers are NOT rescored. The rescore completely REPLACES the original score report — scores are never averaged or combined with the old ones. A rescore can go up, down, or stay the same, and it is impossible to predict the outcome in advance. Only ONE rescore is permitted per test attempt, and it is final. Score changes after a rescore do not mean the original scoring was wrong — small differences in how each human rater scores each trait can add up across a whole test. No additional feedback or question-level reasoning is given about why a score changed, to protect test security. Before requesting a rescore, honestly ask: did I speak clearly, cover all the content, and write genuine (not memorised/templated) responses? In most cases the original AI+human scoring is accurate.

*tags: scoring, rescore, appeal, retake, human rater · priority: 4*

### `scoring.rubric.describe-image`
**Q: How is Describe Image scored, band by band?**

Describe Image is scored on Content (0-6), Pronunciation (0-5), and Oral Fluency (0-5). Content bands: 6 = describes the image fully and accurately, expands on relationships between features for a nuanced interpretation, varied vocabulary used with ease and precision — a listener could build a complete mental picture. 5 = describes main features accurately, identifies some relationships without expanding on them in detail, minor details missing. 4 = some accurate simple descriptions and basic relationships but doesn't cover all main features; basic vocabulary with some repetition. 3 = mainly superficial descriptions with minor inaccuracies; narrow vocabulary repeated. 2 = minimal superficial descriptions with some inaccuracies; very limited vocabulary. 1 = disconnected elements or a list of points with no real description. 0 = relevant to the prompt but too limited to score higher.

*tags: scoring, rubric, describe image, content bands · priority: 4*

### `scoring.rubric.listening-question-types`
**Q: How are Listening's shorter question types scored?**

Multiple Choice Multiple Answers (Listening): 1 point per correct response, minus 1 per incorrect, never below 0. Fill in the Blanks (Type In): 1 point for each word correctly spelled in the blank. Highlight Correct Summary: correct/incorrect, 1 or 0. Multiple Choice Single Answer (Listening): correct/incorrect, 1 or 0. Select Missing Word: correct/incorrect, 1 or 0. Highlight Incorrect Words: 1 point per correctly identified word, minus 1 per incorrect choice. Write from Dictation: 1 point for each word that is both correct AND correctly spelled; 0 for each incorrect or misspelled word.

*tags: scoring, rubric, listening, fill in the blanks, highlight, write from dictation · priority: 3*

### `scoring.rubric.read-aloud`
**Q: How is Read Aloud scored?**

Read Aloud has no separate content score — you're reading text that's already given to you. It's scored on Oral Fluency and Pronunciation only, each on a 0-5 band: 5 Highly proficient, 4 Advanced, 3 Good, 2 Intermediate, 1 Limited/Intrusive, 0 Disfluent/Non-English. You'll have roughly 35-40 seconds to prepare and about 40-45 seconds to read aloud. Focus on smooth, natural delivery rather than speed — avoid unnecessary pauses, hesitations, repetitions, and self-corrections. Use prep time to spot difficult words, punctuation, and natural pause points.

*tags: scoring, rubric, read aloud, oral fluency, pronunciation · priority: 4*

### `scoring.rubric.reading-question-types`
**Q: How are Reading's shorter question types scored (Fill in the Blanks, MCQ, Reorder Paragraph)?**

Fill in the Blanks (Dropdown): partial credit, 1 point for each correctly completed blank. Fill in the Blanks (Drag and Drop): same, 1 point per correctly completed blank. Multiple Choice Multiple Answers: 1 point for each correct response chosen, MINUS 1 point for each incorrect option chosen — but the total for the question never goes below 0. Reorder Paragraph: 1 point for each pair of correct adjacent textboxes/sentences ordered correctly (not all-or-nothing — partial reordering still earns partial credit). Multiple Choice Single Answer: correct/incorrect, 1 or 0.

*tags: scoring, rubric, reading, fill in the blanks, multiple choice, reorder paragraph · priority: 3*

### `scoring.rubric.repeat-sentence`
**Q: How is Repeat Sentence scored?**

Repeat Sentence is scored on Content, Pronunciation, and Oral Fluency (each a trait with its own band), and it contributes to BOTH Listening and Speaking scores, making it one of the highest-impact question types overall. Content scoring: 3 points if all words from the prompt appear in the response in the correct sequence; 2 points if at least 50% of words are correct and in sequence; 1 point if less than 50%; 0 if almost nothing from the prompt is captured. Hesitations and pauses are ignored for Content scoring specifically. You hear each sentence only once with no pause/replay; start speaking promptly after the beep. Do not add extra words, filler phrases ('something like that', 'I think'), or invented content — if you can't remember the whole sentence, repeat as much accurate content as you captured, clearly and fluently, rather than sacrificing fluency to guess at missing words.

*tags: scoring, rubric, repeat sentence, content, pronunciation, oral fluency · priority: 5*

### `scoring.rubric.respond-to-situation`
**Q: How is Respond to a Situation scored, band by band?**

Respond to a Situation is scored on Content (0-6), Pronunciation, Oral Fluency. Content bands: 6 = deals with the situation effectively, fully accomplishes the primary communication goal, considers the full context, communicates with ease/flexibility/precision, situationally appropriate and persuasive. 5 = deals with the situation adequately, accomplishes the goal with only minor omissions. 4 = partially accomplishes the goal with some omissions/misinterpretations, some limitations of expression. 3 = partially accomplishes only the most basic aspect of the goal, limited range of expression, may repeat prompt language without reformulation. 2 = relevant content but doesn't achieve the primary communication goal. 1 = relevant content but a clear lack of understanding of the situation, or only minimally addresses the prompt with no elaboration. 0 = relevant but too limited to score higher. The real test here is whether you actually solved the communication problem presented — not just whether you spoke fluently about the topic.

*tags: scoring, rubric, respond to a situation, content bands · priority: 4*

### `scoring.rubric.retell-lecture`
**Q: How is Retell Lecture scored, band by band?**

Retell Lecture is scored on Content (0-6), Pronunciation (0-5), Oral Fluency (0-5), counting toward Listening and Speaking. Content bands: 6 = clear, accurate, full comprehension, paraphrases main ideas seamlessly in own words with specificity, ideas well connected and logically sequenced. 5 = clear, captures main ideas and some important details, formulated mostly in own words with minor inconsistencies. 4 = captures some main ideas but may include inaccuracies or focus on less important details, only partial reformulation in own words, ideas not well connected. 3 = captures some ideas but may not differentiate important points from details, may include repetition of lecture language without reformulation. 2 = mostly inaccurate/incomplete, heavy reliance on repeating lecture language, lacks coherence. 0 = related to the lecture but too limited to score higher. Key lesson across every band: reformulating ideas in YOUR OWN WORDS consistently scores higher than repeating the lecture's exact wording.

*tags: scoring, rubric, retell lecture, content bands · priority: 4*

### `scoring.rubric.summarize-group-discussion`
**Q: How is Summarize Group Discussion scored, band by band?**

Summarize Group Discussion is scored on Content (0-6), Pronunciation, Oral Fluency, counting toward both Listening and Speaking. Content bands: 6 = full comprehension, paraphrases main ideas seamlessly, expands on each speaker's contribution with specificity, explores relationships between viewpoints and synthesises perspectives effectively. 5 = accurately captures main ideas and some details per speaker, notes some relationships between viewpoints, minor gaps. 4 = captures main ideas and some per-speaker details but may include inaccuracies, focuses more on individual perspectives than relationships between them. 3 = captures some ideas but misses substance/direction of the full conversation, narrow vocabulary, mainly unconnected ideas. 2 = mostly inaccurate/incomplete, relies on repeating discussion language, lacks coherence. 0 = relevant but too limited to score higher. Always represent all three speakers' contributions AND the relationships between them (agree/disagree/add to) — not just three separate summaries.

*tags: scoring, rubric, summarize group discussion, sgd, content bands · priority: 4*

### `scoring.rubric.summarize-spoken-text`
**Q: How is Summarize Spoken Text scored, band by band?**

Summarize Spoken Text is scored on Content (0-4), Form (0-2), Grammar (0-2), Vocabulary (0-2), Spelling (0-2), counting toward Listening and Writing. Content bands mirror Summarize Written Text: 4 = comprehensive, full comprehension, effective paraphrasing, main ideas synthesised concisely; descending to 0 if the response shows no comprehension of the source text. Form: 2 = 50-70 words; 1 = 40-49 or 71-100 words; 0 = under 40 or over 100 words, or written in capitals/no punctuation/only bullet points — zeroes the question. You get 10 minutes, the audio plays only once.

*tags: scoring, rubric, summarize spoken text, sst, content bands, form · priority: 4*

### `scoring.rubric.summarize-written-text`
**Q: How is Summarize Written Text scored, band by band?**

Summarize Written Text is scored on Content (0-4), Form (0-1), Grammar (0-2), Vocabulary (0-2), counting toward Reading and Writing. Content bands: 4 = comprehensive summary, full comprehension, effective paraphrasing, extraneous details removed, all main ideas correctly identified and synthesised concisely. 3 = adequate summary, good comprehension, paraphrasing used but not always consistently, main ideas identified with minor omissions. 2 = partial summary, basic comprehension, no clear discernment between main points and peripheral detail, relies heavily on repeating source-text excerpts. 1 = relevant but not meaningfully summarised, limited comprehension, disconnected ideas/excerpts without synthesis. 0 = too limited to score higher, no comprehension shown. Form: must be written as ONE single complete sentence, 5-75 words — anything else (not one sentence, under 5 or over 75 words, or written in capital letters) scores 0 for Form, which zeroes the whole question regardless of content quality. Ideal length is 35-50 words.

*tags: scoring, rubric, summarize written text, swt, content bands, form · priority: 5*

### `scoring.rubric.write-essay`
**Q: How is Write Essay scored, band by band?**

Write Essay is scored on six traits: Content (0-6), Form (0-2), Development/Structure/Coherence (0-6), General Linguistic Range (0-6), Vocabulary Range (0-2), Grammar (0-2), Spelling (0-2) — all counting toward Writing. Content: 6 = fully addresses the prompt in depth, reformulates the issue seamlessly in own words, argument supported convincingly with relevant examples throughout. Lower bands progressively address the prompt more superficially, down to 0 if the essay doesn't properly deal with the prompt at all. Form: 2 = 200-300 words; 1 = 120-199 or 301-380 words; 0 = under 120 or over 380 words, OR written in all capitals/no punctuation/only bullet points or very short sentences — this zeroes the entire question. Development/Structure/Coherence: 6 = effective logical structure, flows smoothly, clear cohesive argument with well-developed intro/conclusion and logically sequenced paragraphs, varied connective devices used effectively. General Linguistic Range: 6 = varied expressions and vocabulary used with ease and precision, no signs of restriction. Grammar: 2 = consistent control of complex language with rare, hard-to-spot errors. Spelling: 2 = correct, 1 = one error, 0 = more than one error.

*tags: scoring, rubric, write essay, essay, content bands, form, linguistic range · priority: 5*

### `scoring.weighting.question-type-table`
**Q: Which PTE question types are worth the most marks?**

Approximate weighting of each question type toward Overall and skill scores (from Pearson's own scoring documentation): Describe Image 15% Overall / 31% Speaking. Write Essay 7% Overall / 31% Writing. Summarize Written Text 7% Overall / 23% Reading / 28% Writing. Summarize Group Discussion 9% Overall / 20% Listening / 19% Speaking. Repeat Sentence 7% Overall / 17% Listening / 16% Speaking. Retell Lecture 6% Overall / 13% Listening / 13% Speaking. Respond to a Situation 6% Overall / 13% Speaking. Fill in the Blanks (Dropdown, Reading) 7% Overall / 25% Reading. Fill in the Blanks (Drag and Drop, Reading) 6% Overall / 20% Reading. Write from Dictation 5% Overall / 13% Listening / 23% Writing. Summarize Spoken Text 4% Overall / 10% Listening / 18% Writing. Highlight Incorrect Words 4% Overall / 8% Listening / 13% Reading. Read Aloud 4% Overall / 9% Speaking. Reorder Paragraph 3% Overall / 9% Reading. Fill in the Blanks (Type In, Listening) 3% Overall / 8% Listening. Answer Short Question 2% Overall / 4% Listening. Multiple Choice Multiple Answers (Reading) 1% Overall / 5% Reading. Multiple Choice Multiple Answers (Listening) 1% Overall / 3% Listening. Select Missing Word 1% Overall / 1% Listening. Highlight Correct Summary <1% Overall / 2% Listening / 3% Reading. Multiple Choice Single Answer (Reading/Listening) <1% Overall / 2-3% of relevant skill. Important: these weightings cannot be used to predict an exact score — the scoring model also factors in question difficulty, so treat this as a guide to where to focus practice time, not a calculator.

*tags: scoring, weighting, question types, which questions matter most · priority: 4*

---

## Guidance

### `guidance.anti-template-policy`
**Q: Is it risky to use memorised templates/structures in PTE Speaking and Writing?**

Pearson has an official Anti-Template Policy. Templates/structures in this training are meant to teach thinking frameworks, not to be copy-pasted word-for-word as memorised scripts — doing so risks being flagged and scored zero for Content (significant amounts of pre-prepared/memorised material is explicitly listed as a reason for a Content score of 0). Use structures as a flexible skeleton for organising your own ideas about the actual prompt in front of you, never as a fixed script to recite regardless of the question.

*tags: guidance, anti-template, memorised answers, pearson policy, templates · priority: 5*

### `guidance.booking.exam-steps`
**Q: How do I book my PTE Academic exam?**

Steps to book: (1) Visit pearsonpte.com — the official PTE website — and click 'Book a test' or 'Check availability'. (2) Create a myPTE account, or log in if you already have one. (3) Select a test centre by searching location, date, and time. (4) Review ALL your personal details one final time before submitting. (5) Complete payment online (credit/debit card accepted). (6) Save your booking confirmation email. (7) Arrive 30 minutes early with your passport only. Two critical rules: your profile name MUST exactly match your passport — every letter, space, and middle name; any mismatch results in refused entry with NO refund, so double-check before submitting. Your PASSPORT is the ONLY accepted ID at all PTE test centres — no passport means no exam and no refund, with no exceptions.

*tags: guidance, booking, exam booking, passport, myPTE, how to book · priority: 5*

### `guidance.post-results-services`
**Q: What's the difference between a technical review, a rescore, and an appeal?**

Pearson offers three post-results services, each checking a different thing: (1) Technical review — checks for technical issues in audio recordings that may have affected scoring; if issues are found, both the test fee and the review fee are refunded; this service does NOT change scores. (2) Human rescore — the entire test's open-ended responses are rescored by human raters only, and the new score completely replaces the original; scores can go up, down, or stay the same; only one rescore allowed per test sitting; no feedback on individual responses is given. (3) Appeal — only confirms that the rescoring process itself was followed correctly according to Pearson's internal procedures; it does NOT re-assess test responses or explain why individual scores changed.

*tags: guidance, rescore, appeal, technical review, post-results · priority: 3*

---
