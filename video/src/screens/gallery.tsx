import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Backdrop } from "../stage/backdrop";
import { FloatingWindow } from "../stage/floating-window";
import { announcement, roomQuestion, starterThreads, users } from "./demo-data";
import { SiteHeader } from "./site-header";
import { ThreadPage } from "./thread-page";
import { ThreadRow, ThreadRows } from "./thread-row";

/*
 * One frame per rebuilt screen, for side-by-side checks against the live site:
 *   0 header + thread page, dark        1 thread page waiting for review (author)
 *   2 thread page, light                3 a feed of ThreadRows
 *   4 header signed out vs signed in    5 live-site comparison: 1440×900 at 1.2, visitor, no chrome
 *   6 thread page scrolled to the best answer, voted
 *   7 phone (390×844), visitor           8 phone, member, scrolled to the best answer
 */
const screens = [ThreadDark, ThreadPending, ThreadLight, Feed, Headers, LiveCompare, BestAnswer, Phone, PhoneMember];

function Phone() {
  return (
    <FloatingWindow width={390} height={844} scale={1.25} chrome="none" radius={36}>
      <ThreadPage
        device="phone"
        viewer="visitor"
        header={{ announcement }}
        verified={false}
        bestAnswerId={null}
        score={0}
        comments={[]}
      />
    </FloatingWindow>
  );
}

function PhoneMember() {
  return (
    <FloatingWindow width={390} height={844} scale={1.25} chrome="none" radius={36}>
      <ThreadPage device="phone" header={{ bellCount: 1 }} voted score={25} scrollY={0} scrollAnchor="best-answer" scrollAnchorMix={1} />
    </FloatingWindow>
  );
}

export const GALLERY_FRAMES = screens.length;

export function Gallery() {
  const Screen = screens[Math.min(useCurrentFrame(), screens.length - 1)];
  return (
    <AbsoluteFill>
      <Backdrop intensity={1} />
      <Screen />
    </AbsoluteFill>
  );
}

function ThreadDark() {
  return (
    <FloatingWindow width={1280} height={760} scale={1.4}>
      <ThreadPage header={{ bellCount: 2 }} />
    </FloatingWindow>
  );
}

function ThreadPending() {
  return (
    <FloatingWindow width={1280} height={760} scale={1.4}>
      <ThreadPage thread={roomQuestion} status="pending" viewer="author" header={{ bellCount: 0 }} />
    </FloatingWindow>
  );
}

function ThreadLight() {
  return (
    <FloatingWindow width={1280} height={760} scale={1.4} theme="light">
      <ThreadPage header={{ bellCount: 0, themeChoice: "light" }} voted score={25} />
    </FloatingWindow>
  );
}

function Feed() {
  return (
    <FloatingWindow width={1000} height={740} scale={1.4} chrome="none">
      <div className="px-10 pt-6">
        <ThreadRows>
          <ThreadRow thread={starterThreads[0]} hover />
          <ThreadRow thread={starterThreads[6]} />
          <ThreadRow thread={starterThreads[1]} />
          <ThreadRow thread={roomQuestion} />
          <ThreadRow thread={starterThreads[7]} highlight="Rundfunkbeitrag" />
        </ThreadRows>
      </div>
    </FloatingWindow>
  );
}

function Headers() {
  return (
    <>
      <FloatingWindow width={1280} height={98} scale={1.4} y={-200} chrome="none">
        <SiteHeader announcement={announcement} />
      </FloatingWindow>
      <FloatingWindow width={1280} height={57} scale={1.4} y={60} chrome="none">
        <SiteHeader signedIn bellCount={3} active="browse" />
      </FloatingWindow>
      <FloatingWindow width={1280} height={57} scale={1.4} y={240} chrome="none" theme="light">
        <SiteHeader signedIn bellCount={3} moderation={{ pending: 1 }} userName={users.psaTeam.displayName} hover="theme" />
      </FloatingWindow>
    </>
  );
}

function LiveCompare() {
  return (
    <FloatingWindow width={1440} height={900} scale={1.2} chrome="none" radius={0} rim={0}>
      <ThreadPage viewer="visitor" header={{ announcement }} verified={false} bestAnswerId={null} score={0} comments={[]} />
    </FloatingWindow>
  );
}

function BestAnswer() {
  return (
    <FloatingWindow width={1280} height={760} scale={1.4}>
      <ThreadPage header={{ bellCount: 2 }} voted score={25} scrollAnchor="best-answer" scrollAnchorMix={1} />
    </FloatingWindow>
  );
}
