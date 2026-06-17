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

function attachRecordedBy(entry, req, data) {
  const recordedByInfo = getElderRecordedBy(req, data);
  if (!recordedByInfo) return entry;
  return { 
    ...entry, 
    recordedBy: recordedByInfo.digits,
    recordedByName: recordedByInfo.name,
    recordedByMemberNumber: recordedByInfo.memberNumber,
    recordedByUserId: recordedByInfo.userId
  };
}

module.exports = {
  getElderRecordedBy,
  attachRecordedBy
};
