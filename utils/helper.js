/* eslint-disable no-underscore-dangle */
const logger = require('@logger');
const Group = require('../models/group.schema');

// eslint-disable-next-line import/prefer-default-export
const getPublicId = (url) => {
  let publicId = url.substring(url.lastIndexOf('/') + 1);
  publicId = publicId.slice(0, publicId.indexOf('.'));
  return publicId;
};

const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

const filterByScore = (groups, topTeams) => {
  const newTeam = [];
  groups.forEach(async (group) => {
    // push top n teams in group to current round
    for (let i = 0; i < topTeams; i += 1) {
      newTeam.push(group.teams[i]);
    }
  });
  logger.debug(`Filtering teams by score, Total teams: ${newTeam.length}`);
  return newTeam;
};

const filterByQualified = (groups) => {
  const newTeam = [];
  groups.forEach(async (group) => {
    // push top n teams in group to current round
    const tempTeams = group.teams.filter((team) => team.qualified);
    // add tempTeams to newTeam array
    newTeam.push(...tempTeams);
  });
  logger.debug(`Filtering teams by qualified, Total teams: ${newTeam.length}`);
  return newTeam;
};

const generateGroupsFromTeams = (teams, teamsPerGroup, roundNumber) => {
  const groups = [];
  let tempGroup = {};
  // generate groups

  for (let i = 0; i < teams.length; i += 1) {
    if (i % teamsPerGroup === 0) {
      tempGroup = {
        teams: [],
        roundNumber,
        groupNumber: i === 0 ? 1 : i / teamsPerGroup + 1,
      };
      groups.push(tempGroup);
    }

    tempGroup.teams.push({
      team: roundNumber === 1 ? teams[i]._id : teams[i].team.toString(),
      slot: tempGroup.teams.length + 1,
    });
  }

  const newGroups = [];
  // generate group objects
  groups.forEach(async (group) => {
    const grp = new Group(group);
    newGroups.push(grp);
    await grp.save();
  });
  return newGroups;
};

const checkIsMember = (members, userId) => {
  if (members) {
    const t = members.find(
      (member) => member.member.toString() === userId.toString()
    );
    return t;
  }
};

const checkUsersTeam = (teams, userId) => {
  // console.log({teams});
  const res = teams.find((team) => checkIsMember(team.team.members, userId));
  return res;
};

module.exports = {
  getPublicId,
  shuffleArray,
  filterByScore,
  filterByQualified,
  generateGroupsFromTeams,
  checkIsMember,
  checkUsersTeam,
};
