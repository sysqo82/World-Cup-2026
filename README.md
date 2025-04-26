# **World Cup 2026 Management System**

The **World Cup 2026 Management System** is a web-based platform designed to manage and display data for the **FIFA World Cup 2026**. It provides an intuitive interface for administrators and users to interact with tournament data, including group standings, knockout rounds, and final matches.

---

## **Features**

### **1. Dynamic Group Stage Management**
- **Real-Time Group Standings**:
  - Automatically calculates and displays:
    - **Rank**, **Country**, **Played**, **Wins**, **Draws**, **Losses**, **Goal Difference**, and **Points**.
  - Teams are dynamically sorted based on FIFA rules (points, goal difference, goals scored).
- **Admin Controls**:
  - Admins can log in to update match results, goals scored, and other team statistics.
  - Changes are reflected instantly in the group standings.
- **User-Friendly Interface**:
  - Users can view group standings in a clean and responsive layout.

---

### **2. Knockout Rounds Management**
- **Interactive Match Management**:
  - Displays matches for the **Round of 16**, **Quarterfinals**, **Semifinals**, **Third-Place Playoff**, and **Final**.
  - Allows admins to input scores for each match.
- **Extra Time and Penalty Shootouts**:
  - Handles tied matches by enabling extra time and penalty shootouts.
  - Automatically highlights the winning and losing teams after results are submitted.
- **Dynamic Updates**:
  - Match results are saved and displayed in real-time.

---

### **3. Authentication System**
- **Secure Admin Login**:
  - Admins can log in using Firebase Authentication to manage tournament data.
  - Only authenticated users can access admin features.
- **User Registration**:
  - Users must register and log in to view tournament data.
  - Registration ensures secure access to tournament information.

---

### **4. Responsive Design**
- **Mobile-Friendly**:
  - Fully responsive layout ensures a seamless experience on desktops, tablets, and mobile devices.
- **Optimized for All Screen Sizes**:
  - Group tables, match results, and admin forms are designed to adapt to any screen size.

---

### **5. Real-Time Data Integration**
- **Firestore Database**:
  - All tournament data, including group standings and match results, is stored in Firestore.
  - Updates are reflected in real-time across all connected users.
- **Dynamic Content**:
  - The website dynamically fetches and displays data without requiring page reloads.

---

## **How It Works**

### **For Users**
1. **View Group Standings**:
   - Navigate to the group stage page to see the latest standings.
   - Standings are updated dynamically as matches are played.
2. **Follow Knockout Rounds**:
   - View match schedules and results for all knockout stages, including the final.
   - See which teams advance to the next round.

### **For Admins**
1. **Log In**:
   - Use the secure login form to access admin features.
2. **Update Match Results**:
   - Input scores for group stage and knockout matches.
   - Handle tied matches with extra time and penalty shootouts.
3. **Manage Teams**:
   - Update team statistics such as goals scored, matches played, and points.

---

## **Firestore Data Structure**

### **Collection: `groups`**
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

### **Collection: `matches`**
- **Document**: One document per match (e.g., `1A_vs_2B`).
  - **Fields**:
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
cd World-Cup-2026
```

### **2. Install Dependencies**
```bash
yarn install
```

### **3. Start the Application**
- Serve the frontend using `live-server`:
  ```bash
  live-server docs
  ```

---

## **Contributing**

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a pull request.

---