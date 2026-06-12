export default function AnimatedBackground() {
  return (
    <>
      {/* Deep cave base — warm torch glow pools at the bottom, darkness above */}
      <div
        className="fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 110% 50% at 50% 108%, rgba(200,100,15,0.26) 0%, transparent 62%),
            radial-gradient(ellipse 45% 75% at 5% 50%,  rgba(130,60,5,0.13)  0%, transparent 80%),
            radial-gradient(ellipse 45% 75% at 95% 50%, rgba(130,60,5,0.13)  0%, transparent 80%),
            radial-gradient(ellipse 85% 28% at 50% 0%,  rgba(8,4,1,0.96)     0%, transparent 100%),
            #0c0703
          `,
        }}
      />

      {/* Torch glow — flickers independently */}
      <div
        className="fixed inset-x-0 bottom-0 h-1/3 pointer-events-none torch-flicker"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(210,110,20,0.12) 0%, transparent 100%)",
        }}
      />

      {/* Cave wall grain — vertical striations like rough stone */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              91deg,
              transparent 0px, transparent 68px,
              rgba(45,25,6,0.07) 68px, rgba(45,25,6,0.07) 71px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px, transparent 95px,
              rgba(45,25,6,0.05) 95px, rgba(45,25,6,0.05) 97px
            )
          `,
        }}
      />
    </>
  );
}
