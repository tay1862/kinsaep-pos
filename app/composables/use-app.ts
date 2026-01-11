export const useApp = (name = "app") => {
  const loading = useState(`${name}Loading`, () => false);
  const search = useState(`${name}Search`, () => "");

  return {
    loading,
    search,
  };
};
