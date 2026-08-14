# Practice Mode Custom-Length Audit

**Status:** Implementation pass in progress. This note records the verified defect and the release contract; it contains no provider credentials.

## Confirmed root cause

The requested word count reaches `generatePracticeText()` and appears in the provider prompt, but the returned text is only normalized for characters and whitespace. There is no post-response word-count validation, no retry when the response is materially short, and no sentence-safe trimming when it is too long. A response such as 59 words for a 1,236-word request is therefore accepted as successful.

The fixed provider token ceiling also makes large requests unreliable: every provider currently receives a static output cap of 1,800 tokens, regardless of the requested length. This is insufficient as a universal budget for a 2,000-word practice passage after accounting for tokenization and model variance.

## Required behavior

1. Validate the requested length before any provider call and retain the existing 20–2,000 word bounds.
2. Scale the provider output budget with the target length while retaining a safe ceiling.
3. Normalize provider text before measuring it.
4. Treat a materially short response as incomplete, not successful.
5. Allow one controlled expansion/regeneration attempt with a corrective prompt; never silently pad with meaningless filler.
6. Accept a bounded tolerance for natural language rather than pretending an LLM can guarantee an exact count.
7. Trim only at a complete sentence when a response is materially long, preserving readable practice text.
8. Return a clear error if the provider remains materially short after the controlled second attempt.

## QA gates

The deterministic harness must cover a 1,236-word request that first returns 59 words, then returns a compliant response; a repeated short response must produce a clear failure; a long response must be sentence-trimmed; and the request payload must retain Subject, Topic, difficulty, language, keyboard, and target-length constraints. Real-provider checks must sample small, medium, long, and custom targets without exposing the provider key.
