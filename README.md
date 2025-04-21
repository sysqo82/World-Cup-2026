<<<<<<< HEAD
# World Cup 2026 Management System

This project is a web-based application designed to manage and display data for the **World Cup 2026**. It includes features for managing the **Group Stage** and the **Round of 16**, allowing administrators to input scores, update team data, and dynamically display standings and match results. The application integrates with Firestore for data persistence and Firebase Authentication for secure access.

---

## **Features** 

### **1. Group Stage Management**
- **Dynamic Group Tables**:
  - Displays group standings with the following columns:
    - **Rank**: Automatically calculated based on points.
    - **Country**: Name of the team.
    - **Played**: Number of matches played.
    - **Wins (W)**: Number of matches won.
    - **Draws (D)**: Number of matches drawn.
    - **Losses (L)**: Number of matches lost.
    - **Aggregate (Agg)**: Goal difference (Goals Scored - Goals Received).
    - **Points**: Total points (3 points for a win, 1 point for a draw).
  - Teams are automatically sorted by points in descending order.
- **Admin Controls**:
  - Admins can log in to update team details such as:
    - Team name.
    - Matches played, wins, draws, losses, goals scored, and goals received.
  - Changes are dynamically reflected in the group standings.
- **Firestore Integration**:
  - All group data is fetched and updated dynamically from Firestore.

---

### **2. Round of 16 Management**
- **Dynamic Match Management**:
  - Matches are dynamically fetched from Firestore and displayed in a table format.
  - Users can input scores for both teams and submit the results.
  - The winning team is visually highlighted in the table.
- **Extra Time Handling**:
  - If a match ends in a draw during regular time, an **Extra Time** row is dynamically added.
  - Users can input scores for extra time and submit the results.
- **Penalty Shootout Handling**:
  - If a match is still a draw after extra time, a **Penalty Shootout** row is dynamically added.
  - Users can input penalty shootout scores and submit the results.
- **Firestore Integration**:
  - All match data, including scores, winners, losers, extra time, and penalty shootout details, is saved to Firestore.
  - Data persists across page refreshes.

---

### **3. Authentication**
- **Firebase Authentication**:
  - Admins can log in using their email and password.
  - Only authenticated users can access the admin panel to update team data or match results.

---

## **How It Works**

### **1. Group Stage**
- **View Standings**:
  - Group standings are displayed dynamically based on the data in Firestore.
  - Teams are ranked by points, with goal difference and goals scored used as tiebreakers.
- **Update Team Data**:
  - Admins can log in to update team data (e.g., matches played, wins, draws, losses, goals scored, goals received).
  - Changes are immediately reflected in the standings.

### **2. Round of 16**
- **Input Scores**:
  - Users can input scores for both teams in the regular time and submit the results.
- **Handle Draws**:
  - If the match ends in a draw:
    - An **Extra Time** row will appear. Users can input extra time scores and submit them.
    - If the match is still a draw after extra time, a **Penalty Shootout** row will appear. Users can input penalty shootout scores and submit them.
- **Save Results**:
  - Results are saved to Firestore, including:
    - Regular time scores (`team1Score`, `team2Score`).
    - Extra time scores (`extraTimeTeam1Score`, `extraTimeTeam2Score`).
    - Penalty shootout scores (`penaltyTeam1Score`, `penaltyTeam2Score`).
    - Winner and loser information.
- **Highlight Winner**:
  - The winning team is highlighted in the table after the result is submitted.

---

## **Firestore Data Structure**

### Collection: `groups`
- **Document**: One document per group (e.g., `GroupA`, `GroupB`, etc.).
  - **Fields**:
    - `teams`: Array of team objects, each containing:
      - `name`: Name of the team.
      - `played`: Matches played.
      - `wins`: Matches won.
      - `draws`: Matches drawn.
      - `losses`: Matches lost.
      - `goalsScored`: Total goals scored.
      - `goalsReceived`: Total goals received.
      - `points`: Total points.

### Collection: `roundOf16Teams`
- **Document**: `matches`
  - **Fields**:
    - `match`: Match identifier (e.g., `1A vs. 2B`).
    - `team1`: Name of Team 1.
    - `team2`: Name of Team 2.
    - `team1Score`: Regular time score for Team 1.
    - `team2Score`: Regular time score for Team 2.
    - `extraTime`: Boolean indicating if extra time was played.
    - `extraTimeTeam1Score`: Extra time score for Team 1.
    - `extraTimeTeam2Score`: Extra time score for Team 2.
    - `penaltyShootout`: Boolean indicating if a penalty shootout was played.
    - `penaltyTeam1Score`: Penalty shootout score for Team 1.
    - `penaltyTeam2Score`: Penalty shootout score for Team 2.
    - `winner`: Name of the winning team (or `null` if no winner yet).
    - `loser`: Name of the losing team (or `null` if no loser yet).

---

## **Setup Instructions**

### **1. Clone the Repository**
```bash
git clone <repository-url>
=======
# World Cup 2026 Management System

This project is a web-based application designed to manage and display data for the **World Cup 2026**. It includes features for managing the **Group Stage** and the **Round of 16**, allowing administrators to input scores, update team data, and dynamically display standings and match results. The application integrates with Firestore for data persistence and Firebase Authentication for secure access.

---

## **Features** 

### **1. Group Stage Management**
- **Dynamic Group Tables**:
  - Displays group standings with the following columns:
    - **Rank**: Automatically calculated based on points.
    - **Country**: Name of the team.
    - **Played**: Number of matches played.
    - **Wins (W)**: Number of matches won.
    - **Draws (D)**: Number of matches drawn.
    - **Losses (L)**: Number of matches lost.
    - **Aggregate (Agg)**: Goal difference (Goals Scored - Goals Received).
    - **Points**: Total points (3 points for a win, 1 point for a draw).
  - Teams are automatically sorted by points in descending order.
- **Admin Controls**:
  - Admins can log in to update team details such as:
    - Team name.
    - Matches played, wins, draws, losses, goals scored, and goals received.
  - Changes are dynamically reflected in the group standings.
- **Firestore Integration**:
  - All group data is fetched and updated dynamically from Firestore.

---

### **2. Round of 16 Management**
- **Dynamic Match Management**:
  - Matches are dynamically fetched from Firestore and displayed in a table format.
  - Users can input scores for both teams and submit the results.
  - The winning team is visually highlighted in the table.
- **Extra Time Handling**:
  - If a match ends in a draw during regular time, an **Extra Time** row is dynamically added.
  - Users can input scores for extra time and submit the results.
- **Penalty Shootout Handling**:
  - If a match is still a draw after extra time, a **Penalty Shootout** row is dynamically added.
  - Users can input penalty shootout scores and submit the results.
- **Firestore Integration**:
  - All match data, including scores, winners, losers, extra time, and penalty shootout details, is saved to Firestore.
  - Data persists across page refreshes.

---

### **3. Authentication**
- **Firebase Authentication**:
  - Admins can log in using their email and password.
  - Only authenticated users can access the admin panel to update team data or match results.

---

## **How It Works**

### **1. Group Stage**
- **View Standings**:
  - Group standings are displayed dynamically based on the data in Firestore.
  - Teams are ranked by points, with goal difference and goals scored used as tiebreakers.
- **Update Team Data**:
  - Admins can log in to update team data (e.g., matches played, wins, draws, losses, goals scored, goals received).
  - Changes are immediately reflected in the standings.

### **2. Round of 16**
- **Input Scores**:
  - Users can input scores for both teams in the regular time and submit the results.
- **Handle Draws**:
  - If the match ends in a draw:
    - An **Extra Time** row will appear. Users can input extra time scores and submit them.
    - If the match is still a draw after extra time, a **Penalty Shootout** row will appear. Users can input penalty shootout scores and submit them.
- **Save Results**:
  - Results are saved to Firestore, including:
    - Regular time scores (`team1Score`, `team2Score`).
    - Extra time scores (`extraTimeTeam1Score`, `extraTimeTeam2Score`).
    - Penalty shootout scores (`penaltyTeam1Score`, `penaltyTeam2Score`).
    - Winner and loser information.
- **Highlight Winner**:
  - The winning team is highlighted in the table after the result is submitted.

---

## **Firestore Data Structure**

### Collection: `groups`
- **Document**: One document per group (e.g., `GroupA`, `GroupB`, etc.).
  - **Fields**:
    - `teams`: Array of team objects, each containing:
      - `name`: Name of the team.
      - `played`: Matches played.
      - `wins`: Matches won.
      - `draws`: Matches drawn.
      - `losses`: Matches lost.
      - `goalsScored`: Total goals scored.
      - `goalsReceived`: Total goals received.
      - `points`: Total points.

### Collection: `roundOf16Teams`
- **Document**: `matches`
  - **Fields**:
    - `match`: Match identifier (e.g., `1A vs. 2B`).
    - `team1`: Name of Team 1.
    - `team2`: Name of Team 2.
    - `team1Score`: Regular time score for Team 1.
    - `team2Score`: Regular time score for Team 2.
    - `extraTime`: Boolean indicating if extra time was played.
    - `extraTimeTeam1Score`: Extra time score for Team 1.
    - `extraTimeTeam2Score`: Extra time score for Team 2.
    - `penaltyShootout`: Boolean indicating if a penalty shootout was played.
    - `penaltyTeam1Score`: Penalty shootout score for Team 1.
    - `penaltyTeam2Score`: Penalty shootout score for Team 2.
    - `winner`: Name of the winning team (or `null` if no winner yet).
    - `loser`: Name of the losing team (or `null` if no loser yet).

---

## **Setup Instructions**

### **1. Clone the Repository**
```bash
git clone <repository-url>
>>>>>>> d9b6339640c80b00b09af7029f255695e5784c72
cd World-Cup-2026