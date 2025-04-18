import { db } from '../config/firebase-config.js';

export function updatePrizePotCounter() {
    const prizePotCounter = document.getElementById('prize-pot-amount');
    db.collection('users').get().then((snapshot) => {
        let prizePot = 0;
        snapshot.forEach((doc) => {
            prizePot += 5;
        });
        prizePotCounter.innerHTML = `£${prizePot}`;
    }).catch((error) => {
        console.error('Error getting users:', error);
        prizePotCounter.innerHTML = 'Error loading prize pot';
    });
}