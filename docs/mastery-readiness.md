# Practice evidence

Derived locally from completed retrieval events that reference a current question. Ratings, reveal events and duplicate IDs do not count. Removing a question excludes its attempts from this current-bank calculation; unmapped history is disclosed. No schema migration or network request is required.

Per question: newest-first weight `0.85^index`; outcomes 0 / 0.5 / 1. Adjusted mastery = `(sum(weight * outcome) + 2 * 0.5) / (sum(weight) + 2)`. Topic mastery averages reviewed questions equally. No evidence displays no score, not the neutral prior.

Coverage = distinct attempted current questions / available questions. Course coverage is exam-importance-weighted; reviewed mastery is weighted by exam importance times coverage. Missing banks count as zero coverage and are disclosed. These measure question banks, not completeness of all notes.

| Label | Rule in order |
| --- | --- |
| Not started | No mapped retrieval evidence |
| Needs work | Mastery below 60% |
| Exam-ready | Mastery and coverage >=80%, five attempts, three questions, two UTC practice dates, no review due |
| Getting there | Other reviewed topics |

Thresholds are product heuristics, not exam predictions. Limited banks cannot earn Exam-ready. Review-due uses existing retention. Normal answer reveal is not excluded: it is part of recall/reveal/mark.

Scheduling and persisted concept caches are unchanged. New displayed evidence is secondary to the route. No mutable aggregate is stored.
