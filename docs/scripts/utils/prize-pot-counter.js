import { db } from '../config/firebase-config.js';

export function updatePrizePotCounter() {
    const prizePotCounter = document.getElementById('prize-pot-amount');
    db.collection('users').get().then((snapshot) => {
        let prizePot = 0;
        snapshot.forEach((doc) => {
            if (doc.data().hasPaid === true) {
                prizePot += 5;
            }
        });
        const prizePotCounter = document.getElementById('prize-pot-amount');
        
        // Calculate prize splits
        const firstPlace = Math.floor(prizePot * 0.60);
        const secondPlace = Math.floor(prizePot * 0.25);
        const thirdPlace = Math.floor(prizePot * 0.15);
        
        prizePotCounter.innerHTML = `
            <div class="prize-pot-total">£${prizePot}</div>
            <table class="prize-pot-table">
                <thead>
                    <tr>
                        <th>Position</th>
                        <th>Prize Money</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>🥇 1st Place</td>
                        <td>£${firstPlace}</td>
                    </tr>
                    <tr>
                        <td>🥈 2nd Place</td>
                        <td>£${secondPlace}</td>
                    </tr>
                    <tr>
                        <td>🥉 3rd Place</td>
                        <td>£${thirdPlace}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }).catch((error) => {
        console.error('Error getting users:', error);
        prizePotCounter.innerHTML = 'Error loading prize pot';
    });
}

export async function getPrizePot() {
    return new Promise((resolve, reject) => {
        db.collection('users').get().then((snapshot) => {
            let prizePot = 0;
            snapshot.forEach((doc) => {
                if (doc.data().hasPaid === true) {
                    prizePot += 5;
                }
            });
            resolve(prizePot);
        }).catch((error) => {
            console.error('Error getting users:', error);
            reject(error);
        });
    });
}