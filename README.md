## Esports Earnings Visualization Dashboard

This project is an interactive esports analytics dashboard built with **React + D3**.  
Using real esports earnings data, it lets you explore how money and players are distributed across games, genres, and countries through a set of playful, story-driven visualizations.

### What you can do

- 🎮 **Genre-based game explorer**
  - Select a game genre and watch the **“Race of the Top Games”** animation, where a 3D-style stick figure runner represents each game.
  - Games “overtake” each other in order of total earnings, with labels showing game name and prize money.

- 📊 **Game earnings leaderboard**
  - Horizontal bar chart of all games in the selected genre, sorted by total earnings.
  - Hover interactions to highlight games and sync with other views.

- 🌍 **Country choropleth map**
  - World map colored by **total esports earnings** per country for the selected genre.
  - Tooltips on hover show country name, total earnings, and player counts.

- 🧭 **Radial country–game share chart**
  - Radial bar chart showing, for each country, which **single game contributes the largest share** of its prize money.
  - Bars are scaled by **percentage of country earnings**; hover to see country, game, and share.

- scatter: **Players vs Earnings by country**
  - Scatterplot of **player count vs total earnings** per country.
  - Highlights “efficient” countries that earn a lot with relatively fewer players.

- 📈 **Histogram + KDE of game earnings**
  - Histogram of **log-scaled total earnings per game** inside the selected genre.
  - Overlaid KDE curve to show the shape of the distribution.
  - Hover tooltips show how many games fall in each earnings band, with ranges like `$100K–$2.5M`.

### Tech stack

- **Frontend:** React (Vite), modern CSS
- **Visualization:** D3.js (scales, axes, histogram, KDE, radial layout, map projection)
- **Data:** CSV files (`esports_games.csv`, `country_esports.csv`) loaded client-side

This repo is mainly focused on **data storytelling and interaction design** for esports, rather than just static charts.

---

## Running the project locally

Follow these steps to run the Esports Earnings Visualization Dashboard on your machine.

1. **Install prerequisites**
   - Install **Node.js** (v18+ recommended) from https://nodejs.org  
   - Confirm install:
     ```bash
     node -v
     npm -v
     ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/Rishikesh-Vittal/Esports-Data-Visualization.git
   cd Esports-Data-Visualization

3. **Install Dependencies**
   ```bash
   npm install
   ```
   This will install React, Vite, D3, and all other required packages.

4. **Start the server**
   ```bash
   npm run dev
   ```
   Vite will print a local URL in the terminal, typically:
   Local:   http://localhost:5173/

Open that URL in your browser to see the dashboard.
⚠️ Keep the terminal open while developing. The dev server will hot-reload when you edit files.
