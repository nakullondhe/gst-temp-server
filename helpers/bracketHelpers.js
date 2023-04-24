const logger = require('@logger');
const { DB, Timestamp } = require('../services/firebase');

const addToFirebase = async (bracketId, matchId) => {
  try {
    await DB.collection('brackets')
      .doc(bracketId)
      .collection(matchId.toString())
      .add({
        name: 'Moderator',
        message: 'Welcome to 3not3',
        timeStamp: Timestamp.now(),
      });
    return;
  } catch (error) {
    logger.error('Firebase ERROR', error);
    throw new Error(error);
  }
};

const addByeToTeams = (teams, maximumTeams) => {
  const remainingTeams = maximumTeams - teams.length;
  const newTeams = teams;
  for (let i = 0; i < remainingTeams; i += 1) {
    newTeams.push(null);
  }
  return newTeams;
};

module.exports = {
  addByeToTeams,
  addToFirebase,
};
