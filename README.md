# World Cup 2026 Admin Panel

This project is a web-based admin panel for managing and displaying data for the World Cup 2026. It allows administrators to log in, manage team data, and display group standings dynamically.

---

## **Features**

### **Admin Page**
- **Authentication**: Admins can log in using their email and password.
- **Group Management**:
  - View and select groups from a dropdown.
  - Display teams within a selected group.
  - Update team details such as name and matches played.
- **Firestore Integration**:
  - Data is fetched and updated dynamically from Firestore.

### **Public Page**
- **Dynamic Group Tables**:
  - Displays group standings with the following columns:
    - Rank
    - Country
    - Played
    - Wins (W)
    - Draws (D)
    - Losses (L)
    - Aggregate (Agg: Goals Scored - Goals Received)
    - Points
  - Teams are sorted by points in descending order.

---

## **Setup Instructions**

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd World-Cup-2026