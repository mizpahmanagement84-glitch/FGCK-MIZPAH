function getElderRecordedBy(req, data) {
  if (!req.user || req.user.role !== 'elder') return null;
  const members = data.members || [];
  const member = members.find((m) => Number(m.id) === Number(req.user.id));
  if (!member || !member.memberNumber) return null;
  const digits = String(member.memberNumber).slice(-3);
  return {
    digits,
    name: member.firstName || 'Elder',
    memberNumber: member.memberNumber,
    userId: member.id
  };
}

function getSecretarySessionId(req) {
  if (!req.user || req.user.role !== 'secretary') return null;
  return req.user?.sessionId || 'unknown';
}

function attachRecordedBy(entry, req, data) {
  const recordedByInfo = getElderRecordedBy(req, data);
  if (recordedByInfo) {
    return { 
      ...entry, 
      recordedBy: recordedByInfo.digits,
      recordedByName: recordedByInfo.name,
      recordedByMemberNumber: recordedByInfo.memberNumber,
      recordedByUserId: recordedByInfo.userId
    };
  }
  
  // Attach sessionId for secretaries
  const sessionId = getSecretarySessionId(req);
  if (sessionId) {
    return { 
      ...entry, 
      sessionId,
      recordedByName: req.user?.recordedByName || 'Secretary'
    };
  }
  
  return entry;
}

module.exports = {
  getElderRecordedBy,
  getSecretarySessionId,
  attachRecordedBy
};
