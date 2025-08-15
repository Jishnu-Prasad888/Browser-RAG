import DarkVeil from "./Components/Background";
import ChatInterfaceComponent from "./Components/ChatInterface";

export default function ChatInterface() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1, // background layer
        }}
      >
        <DarkVeil />
      </div>

      <div style={{ zIndex: 1 }} className="w-full">
        {/* <div className="fixed bottom-4 left-0 w-full px-4 ">
          <QueryBox />
        </div> */}
        <ChatInterfaceComponent />
      </div>
    </>
  );
}
