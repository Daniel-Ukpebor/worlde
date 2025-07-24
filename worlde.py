import random

print('Welcome to Wordle!')
print('Guess the secret 5-letter word.')
print('📝 Example: 🟩  = correct spot, 🟨  = wrong spot, ⬜  = not in word.\n')


words = [
    "about", "other", "which", "their", "there", "first", "could", "water", "after",
    "where", "right", "think", "three", "place", "sound", "great", "again", "still",
    "every", "small", "found", "those", "never", "under", "might", "house", "world",
    "below", "plant", "group", "heart", "stand", "horse", "start", "light", "paper",
    "black", "apple", "tiger", "zebra", "spine", "glass", "brave", "crane", "flute"
]

num = random.randint(0, len(words))
word_chosen = words[num]


def runs():
    tries = 6
    while tries > 0:
        guess = input(f"({tries} tries left) Enter your guess: ")
        if guess.lower() == word_chosen.lower():
            print('🎉 You guessed the word! You win!')
            return True
        feedback = ""
        for i in range(5):
            if guess[i].lower() == word_chosen[i].lower():
                feedback += '🟩 '
            elif guess[i].lower() in word_chosen.lower():
                feedback += '🟨 '
            else:
                feedback += '⬜ '
        print(feedback)
        tries -= 1

    print(f"You lose! The word was: {word_chosen}")
    return False

runs()

Initial commit: Add Wordle game
