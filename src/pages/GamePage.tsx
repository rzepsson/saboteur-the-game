import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api.js";
import type { Id } from "../../convex/_generated/dataModel.js";
import { useTranslation } from "../lib/locale.js";
import { getSessionId } from "../lib/session.js";
import { actionKind, isPathCard, type Tool } from "../lib/cards.js";
import { cellKey, computePlaceableCells } from "../lib/board.js";
import { useCountdown } from "../lib/useCountdown.js";
import { GameBoard, type BoardMode } from "../components/game/GameBoard.js";
import { GameBackground } from "../components/game/GameBackground.js";
import { CenterCard } from "../components/game/CenterCard.js";
import { GameTopBar } from "../components/game/GameTopBar.js";
import { PlayersStrip } from "../components/game/PlayersStrip.js";
import { HandBar } from "../components/game/HandBar.js";
import { RoundEndOverlay } from "../components/game/RoundEndOverlay.js";
import { FinishedOverlay } from "../components/game/FinishedOverlay.js";
import type { SelectedKind } from "../components/game/types.js";

const HEARTBEAT_INTERVAL_MS = 10_000;

export default function GamePage() {
  const m = useTranslation();
  const { code } = useParams<{ code: string }>();
  const codeStr = code ?? "";
  const navigate = useNavigate();
  const sessionId = useRef(getSessionId()).current;

  const room = useQuery(api.rooms.get, { code: codeStr });
  const myPlayer = useQuery(api.rooms.getMyPlayer, { code: codeStr, sessionId });
  const state = useQuery(api.games.getGameState, { code: codeStr });
  const myHand = useQuery(api.games.getMyHand, { code: codeStr, sessionId });
  const myRole = useQuery(api.games.getMyRole, { code: codeStr, sessionId });

  const playCard = useMutation(api.games.playCard);
  const continueGame = useMutation(api.games.continueGame);
  const returnToLobby = useMutation(api.games.returnToLobby);
  const sendHeartbeat = useMutation(api.rooms.heartbeat);

  const [selectedCardId, setSelectedCardId] = useState<Id<"gameCards"> | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [repairTarget, setRepairTarget] = useState<Id<"players"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomId = room?._id;

  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => void sendHeartbeat({ sessionId, roomId }), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roomId, sendHeartbeat, sessionId]);

  useEffect(() => {
    if (room === null) {
      void navigate("/", { replace: true });
      return;
    }
    if (room && room.status === "waiting") {
      void navigate(`/lobby/${codeStr}`, { replace: true });
    }
  }, [room, navigate, codeStr]);

  useEffect(() => {
    if (myPlayer === null) void navigate("/", { replace: true });
  }, [myPlayer, navigate]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 2500);
    return () => clearTimeout(id);
  }, [error]);

  const remaining = useCountdown(state?.turnDeadline ?? 0, state?.status === "playing");

  // Loading
  if (
    room === undefined ||
    myPlayer === undefined ||
    state === undefined ||
    myHand === undefined ||
    myRole === undefined
  ) {
    return <CenterCard text={m.game_loading()} />;
  }
  if (!state || !myHand || !myRole) {
    return <CenterCard text={m.game_starting()} />;
  }

  const isHost = myPlayer?.isHost ?? false;
  const isMyTurn = myHand.isMyTurn && state.status === "playing";
  const rolesRevealed = state.status !== "playing";

  const selectedCard = myHand.hand.find((c) => c._id === selectedCardId) ?? null;
  const selectedKind: SelectedKind = selectedCard
    ? isPathCard(selectedCard.subtype)
      ? "place"
      : actionKind(selectedCard.subtype)
    : null;
  const boardMode: BoardMode =
    selectedKind === "place"
      ? "place"
      : selectedKind === "rockfall"
        ? "rockfall"
        : selectedKind === "map"
          ? "map"
          : "idle";

  const placeable =
    boardMode === "place"
      ? computePlaceableCells([
          ...state.board.map((p) => cellKey(p.x, p.y)),
          ...state.goals.map((g) => cellKey(g.x, g.y)),
        ])
      : new Set<string>();

  const peekedMap: Record<number, string> = {};
  for (const p of myRole.peekedGoals) peekedMap[p.index] = p.subtype;

  const targetMode = selectedKind === "broken" || selectedKind === "repair";
  const currentPlayer = state.players.find((p) => p._id === state.currentPlayerId);
  const currentPlayerName = currentPlayer?.nickname ?? "—";

  const clearSelection = () => {
    setSelectedCardId(null);
    setFlipped(false);
    setRepairTarget(null);
  };

  const doPlay = async (move: Parameters<typeof playCard>[0]["move"]) => {
    try {
      await playCard({ sessionId, code: codeStr, move });
      clearSelection();
    } catch {
      setError(m.game_error_invalid_move());
    }
  };

  const handleSelect = (cardId: Id<"gameCards">) => {
    if (!isMyTurn) return;
    setRepairTarget(null);
    setFlipped(false);
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  };

  const onTargetPlayer = (pid: Id<"players">) => {
    if (!selectedCard) return;
    if (selectedKind === "broken") {
      void doPlay({ kind: "broken", cardId: selectedCard._id, targetPlayerId: pid });
    } else if (selectedKind === "repair") {
      setRepairTarget(pid);
    }
  };

  const onPickRepairTool = (tool: Tool) => {
    if (!selectedCard || !repairTarget) return;
    void doPlay({ kind: "repair", cardId: selectedCard._id, targetPlayerId: repairTarget, tool });
  };

  return (
    <div className="relative h-svh flex flex-col font-game overflow-hidden">
      <GameBackground />

      <GameTopBar
        round={state.round}
        numberOfRounds={state.numberOfRounds}
        deckCount={state.deckCount}
        status={state.status}
        isMyTurn={isMyTurn}
        currentPlayerName={currentPlayerName}
        remaining={remaining}
        myRole={myRole.role}
      />

      <PlayersStrip
        players={state.players}
        currentPlayerId={state.currentPlayerId}
        myPlayerId={myRole.myPlayerId}
        myRole={myRole.role}
        rolesRevealed={rolesRevealed}
        targetMode={targetMode}
        isMyTurn={isMyTurn}
        repairTarget={repairTarget}
        onTargetPlayer={onTargetPlayer}
      />

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
        <GameBoard
          placements={state.board}
          goals={state.goals}
          peekedMap={peekedMap}
          mode={boardMode}
          placeable={placeable}
          onPlace={(x, y) =>
            selectedCard && void doPlay({ kind: "place", cardId: selectedCard._id, x, y, flipped })
          }
          onRockfall={(x, y) =>
            selectedCard && void doPlay({ kind: "rockfall", cardId: selectedCard._id, x, y })
          }
          onMapPeek={(goalIndex) =>
            selectedCard && void doPlay({ kind: "map", cardId: selectedCard._id, goalIndex })
          }
        />
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-44 left-1/2 -translate-x-1/2 z-30 bg-red-700 text-white font-bold px-5 py-2 rounded-lg border-2 border-red-900 shadow-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <HandBar
        hand={myHand.hand}
        selectedCardId={selectedCardId}
        selectedCard={selectedCard}
        selectedKind={selectedKind}
        flipped={flipped}
        isMyTurn={isMyTurn}
        repairTarget={repairTarget}
        players={state.players}
        currentPlayerName={currentPlayerName}
        onSelect={handleSelect}
        onFlip={() => setFlipped((f) => !f)}
        onPass={() => selectedCard && void doPlay({ kind: "pass", cardId: selectedCard._id })}
        onCancel={clearSelection}
        onPickRepairTool={onPickRepairTool}
      />

      {/* Round end / finished overlays */}
      <AnimatePresence>
        {state.status === "round_end" && state.roundResult && (
          <RoundEndOverlay
            roundResult={state.roundResult}
            players={state.players}
            isHost={isHost}
            onContinue={() => void continueGame({ sessionId, code: codeStr })}
          />
        )}

        {state.status === "finished" && (
          <FinishedOverlay
            players={state.players}
            isHost={isHost}
            onReturn={() => void returnToLobby({ sessionId, code: codeStr })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
