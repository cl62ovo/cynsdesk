import type { Metadata } from "next";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, getOwnerId } from "../../../lib/content-store";
import { getIllustratedSession } from "../../../lib/illustrated-sessions";
import StudioClient from "../little-things-i-noticed/StudioClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "private studio · Cynthia 的桌面",
  robots: { index: false, follow: false },
};

export default async function IllustratedStudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getIllustratedSession(slug);

  if (!config) {
    return (
      <main className="studio-shell missing-session">
        <a href="/" target="_top">← back to the desk</a>
        <p>this little studio does not exist yet.</p>
      </main>
    );
  }

  const user = await getChatGPTUser();
  const ownerId = await getOwnerId();
  const returnTo = `/studio/${config.slug}`;
  const galleryPath = `/sessions/${config.slug}`;

  if (!user) {
    return (
      <StudioFrame theme={config.theme} title={config.studioTitle} backPath={galleryPath}>
        <section className="claim-card">
          <span className="entry-tape" aria-hidden="true" />
          <h2>This little door is private.</h2>
          <p>Sign in with ChatGPT to check whether this desk belongs to you.</p>
          <a href={chatGPTSignInPath(returnTo)} target="_top">sign in to the studio</a>
        </section>
      </StudioFrame>
    );
  }

  if (!ownerId) {
    return (
      <StudioFrame theme={config.theme} title={config.studioTitle} backPath={galleryPath}>
        <StudioClient entries={[]} canClaim sessionSlug={config.slug} />
      </StudioFrame>
    );
  }

  if (ownerId !== user.userId) {
    return (
      <StudioFrame theme={config.theme} title={config.studioTitle} backPath={galleryPath}>
        <section className="claim-card">
          <span className="entry-tape" aria-hidden="true" />
          <h2>This is Cynthia&apos;s private drawer.</h2>
          <p>You can enjoy everything on display, but this part stays locked.</p>
        </section>
      </StudioFrame>
    );
  }

  const entries = await getEntries(config.slug, true);
  return (
    <StudioFrame theme={config.theme} title={config.studioTitle} backPath={galleryPath} owner>
      <StudioClient
        entries={entries}
        sessionSlug={config.slug}
        freshLabel={config.freshLabel}
        collectionLabel={config.collectionLabel}
        itemNoun={config.itemNoun}
        storageLabel={config.storageLabel}
        listeningFields={config.editorKind === "listening"}
        readingFields={config.editorKind === "reading"}
        thoughtFields={config.editorKind === "thoughts"}
        workbenchFields={config.editorKind === "workbench"}
      />
    </StudioFrame>
  );
}

function StudioFrame({
  theme,
  title,
  backPath,
  owner = false,
  children,
}: {
  theme: string;
  title: string;
  backPath: string;
  owner?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className={`studio-shell illustrated-studio ${theme}`}>
      <header className="studio-heading">
        <a href={backPath} target="_top">← see the collection</a>
        {owner && <p>private · only visible to you</p>}
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}
