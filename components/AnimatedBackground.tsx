const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated stripes */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="animated-stripe h-full"
          style={{
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 0.8}s`,
            opacity: 0.25 + (i % 3) * 0.15,
          }}
        />
      ))}
      
      {/* Gradient orbs */}
      <div 
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(338 100% 60% / 0.15) 0%, transparent 70%)',
        }}
      />
      <div 
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(280 80% 60% / 0.1) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
