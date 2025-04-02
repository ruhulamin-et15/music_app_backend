export const courseFilter = (search: string | null) => {
  if (!search) {
    return undefined;
  }

  const searchConditions = [];
  if (search) {
    searchConditions.push({
      courseName: { contains: search, mode: "insensitive" },
    });
  }

  return {
    OR: searchConditions,
  };
};
