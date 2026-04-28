export const calculateAdimplentesCount = (members: any[]): number => {
  const filteredMembers = members.filter(member => {
    const planName = member.NomeContrato?.toLowerCase() || '';
    return !(
      planName.includes('influenciador') ||
      planName.includes('personal') ||
      planName.includes('combo 3 diárias') ||
      planName.includes('wellhub') ||
      planName.includes('totalpass')
    );
  });

  let membersWithActiveStatus = 0;
  filteredMembers.forEach(member => {
    const status = member.StatusContrato?.toLowerCase() || '';
    if (status.includes('ativo')) {
      membersWithActiveStatus++;
    }
  });
  return membersWithActiveStatus;
};