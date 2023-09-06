const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const serviceAccount = require('../config/key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'music-soul-bd229.appspot.com'
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/css', (req, res, next) => {
  res.type('text/css');
  next();
}, express.static(path.join(__dirname, '../frontend/src/css')));

app.use('/public', express.static(path.join(__dirname, '../frontend/public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/src/templates/head.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, "/../frontend/src/templates/signup.html"));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, "/../frontend/src/templates/login.html"));
});

app.get('/musicsouls', (req, res) => {
  res.sendFile(path.join(__dirname, "/../frontend/src/templates/music.html"));
});

app.get('/request', (req, res) => {
  res.sendFile(path.join(__dirname, "/../frontend/src/templates/request.html"));
});

app.post('/signupSubmit', async (req, res) => {
  const  username = req.body.name;
  const password = req.body.password;
  try {
    console.log('Username:', username);
    const userRef = admin.firestore().collection('users').doc(username);
    await userRef.set({ password });
    res.redirect('/login'); 
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/loginSubmit', async (req, res) => {
  const username = req.body.name;
  const password = req.body.password;
  try {
    const userDoc = await admin.firestore().collection('users').doc(username).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.password === password) {
        res.redirect(`/musicsouls?username=${username}`);
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/like', async (req, res) => {
  console.log('Received like request:', req.body);
  const { username, songImage, songName } = req.body;
  try {
    const userRef = admin.firestore().collection('users').doc(username);
    
    const likedSongQuery = await userRef.collection('likedSongs').where('songName', '==', songName).get();
    if (likedSongQuery.empty) {
      await userRef.collection('likedSongs').add({ songImage, songName });
      res.json({ message: 'Song liked and stored successfully' });
    }  else {
      likedSongQuery.docs.forEach(async doc => {
        await userRef.collection('likedSongs').doc(doc.id).delete();
      });
      res.json({ message: 'Song unliked and removed successfully' });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/getLikedSongs', async (req, res) => {
  const username = req.query.username;

  try {
    const userRef = admin.firestore().collection('users').doc(username);
    const likedSongsSnapshot = await userRef.collection('likedSongs').get();

    const likedSongsArray = [];
    likedSongsSnapshot.forEach(doc => {
      likedSongsArray.push({
        songName: doc.data().songName,
        songImage: doc.data().songImage 
      });
    });

    res.json({ likedSongsArray });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/getSongSignedURL', async (req, res) => {
  try {
    const songName = req.query.songName;

    if (!songName) {
      return res.status(400).send('Song name not provided');
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file('songs/' + songName + '.mp3');

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    res.send(url);
  } catch (error) {
    console.error('Error getting signed URL:', error);
    res.status(500).send('Internal server error');
  }
});

app.post("/songSubmit", async (req, res) => {
  const songName = req.body.song;
  try {
    const SongsRequested = admin.firestore().collection('Requested-Songs');
    const result = await SongsRequested.add({
      songName: songName,
    });

    res.status(200).json({ message: 'Song submitted successfully', documentId: result.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
