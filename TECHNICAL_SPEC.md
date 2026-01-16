# Technical Specification: "The Imposter"

## 1. System Architecture
*   **Framework:** Expo (React Native) with "Metro for Web".
*   **Language:** TypeScript.
*   **Backend:** Supabase (Postgres & Realtime).
*   **Styling:** NativeWind (Tailwind for React Native) to keep development fast.
*   **Navigation:** Expo Router (File-based routing similar to Next.js).

## 2. Data Models (Supabase Postgres)

### Tables

**`rooms`**
*   `code` (text, PK): 4-letter unique room code (e.g., "ABCD").
*   `status` (enum): `LOBBY`, `PLAYING_CLUES`, `PLAYING_VOTING`, `PLAYING_GUESS`, `FINISHED`.
*   `word_check_code` (text): Hash or simple ID of the current word pair (prevents cheating).
*   `imposter_id` (uuid): ID of the generated player who is the imposter.
*   `civilian_word` (text): The word for civilians.
*   `imposter_word` (text): The word for the imposter.

**`players`**
*   `id` (uuid, PK): Unique device/socket ID.
*   `room_code` (text, FK): Links to room.
*   `nickname` (text): User chosen name.
*   `avatar_id` (text): ID for their cosmetic avatar.
*   `is_host` (boolean): Can controls game flow.

**`clues`**
*   `id` (int, PK).
*   `player_id` (uuid, FK).
*   `room_code` (text).
*   `content` (text): The clue word submitted.
*   `round_number` (int): Track history.

## 3. Realtime Events (Supabase Realtime)

The client subscribes to `room_code`.

*   **`player_join`**: Update Lobby UI list.
*   **`game_start`**: Trigger navigation to Game View.
*   **`phase_change`**:
    *   `CLUE_PHASE`: Show input box.
    *   `VOTE_PHASE`: Show voting grid.
*   **`clue_submitted`**: Animate new clue appearing on Shared Screen.
*   **`votes_revealed`**: Show vote counts and elimination animation.

## 4. Key Algorithms

### Word Assignment Logic
When `START_GAME` is triggered:
1.  Server/Admin fetching a random `WordPair` (e.g., `{civ: "Dog", imp: "Wolf"}`).
2.  Server assigns `imposter_id` = random `player_id`.
3.  Server updates `rooms` table.
4.  **Client Side Security**: Clients fetch their word.
    *   `IF my_id == imposter_id THEN show(word_pair.imp)`
    *   `ELSE show(word_pair.civ)`

### The "Imposter" Win Check
1.  **Voting Calculation**:
    *   Count votes per player.
    *   If `max_votes_player == imposter_id` -> **IMPOSTER CAUGHT**.
    *   Else -> **IMPOSTER WINS** (Civilians voted wrong).
2.  **The Guess**:
    *   If Caught, show Imposter a list of 10 words (The real word + 9 decoys from the same category).
    *   If `guess == civilian_word` -> **IMPOSTER STEALS WIN**.

## 5. UI/UX Flow

### View: Mobile (Controller)
*   **Lobby**: "Waiting for Host...", Avatar selector.
*   **Game**:
    *   Large Card: "YOUR WORD IS: **[WORD]**".
    *   Input: "Enter your clue".
    *   Voting: List of names to tap.
    *   Waiting: "Look at the TV".

### View: Desktop/TV (Shared Board)
*   **Lobby**: QR Code to join, List of avatars bouncing.
*   **Game**:
    *   Show all submitted clues in a cool list.
    *   Show a timer.
    *   **Voting Reveal**: Suspenseful animation showing who voted for whom.
    *   **Winner Screen**: Celebration confetti.
