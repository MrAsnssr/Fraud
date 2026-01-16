# Game Design Document: "The Imposter"

## Core Concept
"The Imposter" is a social deduction party game for 3-8 players. It is played in a single physical room (or over voice chat), using a shared screen (TV/Computer) as the "Board" and personal devices (Phones) as "Secret Controllers".

## The Roles

### 1. The Civilians (Majority)
*   **Goal:** Identify the Imposter and vote them out.
*   **Knowledge:** They all share the same **Secret Word** (e.g., "Apple").
*   **Behavior:** They must give clues that are vague enough so the Imposter doesn't figure out the word, but specific enough so other Civilians know they are safe.

### 2. The Imposter (One Player)
*   **Goal:** Blend in, survive the vote, and deduce the Civilians' word.
*   **Knowledge:** They have a **Decoy Word** that is related but slightly different (e.g., "Pear"). *Crucially, they do not know they are the Imposter.* They believe they are a Civilian until they realize their word doesn't match the clues.
*   **Behavior:** They must give clues that fit their word ("Pear") which hopefully also fit the Civilians' word ("Apple").

## Gameplay Loop

### Phase 1: The Assignment
*   Every player looks at their phone.
*   The screen reveals their secret word.
*   *Example:* 3 players see "Soccer", 1 player (Imposter) sees "Football".

### Phase 2: The Clues
*   The game picks a random order.
*   On their turn, a player types a **single-word clue** related to their secret word into their phone.
*   The clue appears on the Main Screen for everyone to see.
*   *Example:*
    *   Player 1 (Civilian "Soccer"): "Grass"
    *   Player 2 (Imposter "Football"): "Touchdown" (Suspicious! But maybe acceptable?)
    *   Player 3 (Civilian "Soccer"): "Ball"
    *   Player 4 (Civilian "Soccer"): "Goal"

### Phase 3: The Vote
*   After all clues are submitted, players discuss.
*   "Player 2 said 'Touchdown', but we're talking about 'Soccer'. That's the American version!"
*   Everyone votes on their phone for who they think the Imposter is.
*   If the Imposter receives the most votes, they are **CAUGHT**.

### Phase 4: Validating the Win
*   **If Imposter is Caught:** They have one last chance to steal the win. The game presents them with a list of 10 similar words (Soccer, Rugby, Tennis, Baseball, etc.).
    *   If they guess the Civilians' word ("Soccer"), the **Imposter Wins**.
    *   If they fail, the **Civilians Win**.
*   **If a Civilian is Voted Out:** The **Imposter Wins** immediately.

## Example Word Pairs
The tension comes from the similarity of the words.
*   **Coffee** vs **Tea**
*   **Shower** vs **Bath**
*   **Beach** vs **Desert**
*   **Superman** vs **Batman**
*   **Harry Potter** vs **Gandalf**
