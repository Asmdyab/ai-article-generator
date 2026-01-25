const Loader = () => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <div className="loader-dot" style={{ animationDelay: '0s' }} />
      <div className="loader-dot" style={{ animationDelay: '0.2s' }} />
      <div className="loader-dot" style={{ animationDelay: '0.4s' }} />
    </div>
  );
};

export default Loader;
