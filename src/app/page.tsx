import Image from "next/image";
import { FundingWorkspace } from "@/components/funding-workspace";
import vhsLogo from "./vhs-logo.png";

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#beratung">Zum Förderfinder</a>
      <header className="masthead">
        <div className="wrap masthead-inner">
          <div className="brand">
            <Image src={vhsLogo} alt="vhs" width={105} priority />
            <span>Volkshochschulverband<br />Baden-Württemberg</span>
          </div>
          <a className="site-link" href="https://www.vhs-bw.de/">
            Zur Verbandswebsite <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="wrap hero-inner">
            <h1 id="page-title">Förderfinder</h1>
            <p>Beschreiben Sie Ihr Vorhaben und finden Sie passende Förderprogramme für Ihre Volkshochschule.</p>
          </div>
        </section>
        <FundingWorkspace />
      </main>
    </>
  );
}
