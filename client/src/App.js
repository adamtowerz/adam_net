import "./App.css";

import Fleet from "./Fleet";

function App() {
  return (
    <div className="App">
      <header>
        <h1>
          Welcome to <code>adam_net</code>
        </h1>
      </header>
      <main>
        <section>
          <h2>Fleet</h2>
          <Fleet />
        </section>
      </main>
      <footer>
        please don't use this maliciously. you could like turn off my farm or
        something. that'd be rude :'(
      </footer>
    </div>
  );
}

export default App;
