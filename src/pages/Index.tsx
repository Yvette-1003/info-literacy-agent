import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Eye,
  Search,
  Scale,
  Lightbulb,
  Trophy,
  CheckCircle2,
  XCircle,
  Network,
  RefreshCw,
  MessageSquare,
  Target,
  GraduationCap,
  Layers,
} from "lucide-react";
import {
  coreLiteracies,
  literacyLevels,
  knowledgeBase,
  challenges,
  type Challenge,
} from "@/data/knowledge";
import {
  generateResponse,
  quickQuestions,
  type ChatMessage,
} from "@/lib/chat-engine";

// ========== 图标映射 ==========
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye,
  Search,
  Scale,
  Lightbulb,
  ShieldCheck,
};

// ========== 简单 Markdown 渲染 ==========
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    // 空行
    if (!line.trim()) {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    // 标题行 (### **xxx**)
    if (line.startsWith("**") && line.endsWith("**") && !line.includes(" ")) {
      elements.push(
        <p key={idx} className="font-bold text-sm mt-1">
          {line.replace(/\*\*/g, "")}
        </p>
      );
      return;
    }

    // 列表项
    if (line.match(/^\d+\./) || line.startsWith("•") || line.startsWith("- ")) {
      const content = line.replace(/^(\d+\.|•|-)\s*/, "");
      elements.push(
        <div key={idx} className="flex gap-2 text-sm leading-relaxed ml-1">
          <span className="text-primary shrink-0">{line.match(/^\d+\./) ? line.match(/^\d+\./)?.[0] : "•"}</span>
          <span>{renderInlineBold(content)}</span>
        </div>
      );
      return;
    }

    // 普通段落（含行内加粗）
    elements.push(
      <p key={idx} className="text-sm leading-relaxed">
        {renderInlineBold(line)}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ========== 生成唯一ID ==========
function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ========== 主组件 ==========
const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: genId(),
      role: "assistant",
        content:
        "你好！我是**信息素养小助手** \n\n我专门帮助初中同学学习和提升信息素养。你可以直接问我任何问题，也可以浏览知识图谱或挑战情境题目。\n\n**五维能力框架：**\n1. 信息意识\n2. 信息获取\n3. 信息评价\n4. 信息利用\n5. 信息道德\n\n准备好了吗？让我们开始吧！",
      timestamp: Date.now(),
      suggestions: ["什么是信息素养？", "怎么辨别假新闻？", "有哪些好用的学习工具？"],
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 学习进度追踪
  const [learnedTopics, setLearnedTopics] = useState<Set<string>>(new Set());
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // 发送消息
  const handleSend = useCallback(
    (text?: string) => {
      const content = (text ?? inputValue).trim();
      if (!content) return;

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsTyping(true);

      // 模拟思考延迟
      setTimeout(() => {
        const result = generateResponse(content);
        const assistantMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: result.content,
          timestamp: Date.now(),
          relatedKnowledge: result.relatedKnowledge,
          suggestions: result.suggestions,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);

        // 记录学习进度
        if (result.relatedKnowledge) {
          setLearnedTopics((prev) => {
            const next = new Set(prev);
            result.relatedKnowledge!.forEach((id) => next.add(id));
            return next;
          });
        }
      }, 600 + Math.random() * 400);
    },
    [inputValue]
  );

  // 挑战答题
  const handleChallengeAnswer = (index: number) => {
    if (selectedAnswer !== null || !currentChallenge) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    setCompletedChallenges((prev) => new Set(prev).add(currentChallenge.id));
  };

  const startRandomChallenge = () => {
    const uncompleted = challenges.filter((c) => !completedChallenges.has(c.id));
    const pool = uncompleted.length > 0 ? uncompleted : challenges;
    const random = pool[Math.floor(Math.random() * pool.length)];
    setCurrentChallenge(random);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  // 进度统计
  const totalTopics = knowledgeBase.length;
  const learnedCount = learnedTopics.size;
  const progressPercent = Math.round((learnedCount / totalTopics) * 100);
  const challengeProgress = Math.round((completedChallenges.size / challenges.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* ========== 顶部导航栏 ========== */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                信息素养智能体
              </h1>
              <p className="text-xs text-muted-foreground">初中生信息素养学习助手</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">知识掌握</span>
              <Badge variant="secondary" className="font-mono">
                {learnedCount}/{totalTopics}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">挑战完成</span>
              <Badge variant="secondary" className="font-mono">
                {completedChallenges.size}/{challenges.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* ========== 主体内容 ========== */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="chat" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                智能问答
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-1.5">
                <Network className="h-4 w-4" />
                知识图谱
              </TabsTrigger>
              <TabsTrigger value="challenge" className="gap-1.5">
                <Target className="h-4 w-4" />
                情境挑战
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========== Tab 1: 智能问答 ========== */}
          <TabsContent value="chat" className="mt-0">
            <div className="mx-auto max-w-4xl">
              <Card className="h-[calc(100vh-220px)] min-h-[500px] flex flex-col shadow-xl border-blue-100">
                {/* 消息列表 */}
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-base">信息素养对话</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="mr-1 h-3 w-3" />
                      智能问答
                    </Badge>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
                  <div className="space-y-4 py-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} onSuggestionClick={handleSend} />
                    ))}
                    {isTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* 快捷问题 */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-muted-foreground mb-2">💡 试试这些问题：</p>
                    <div className="flex flex-wrap gap-2">
                      {quickQuestions.map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => handleSend(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 输入区域 */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="输入你的信息素养问题..."
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!inputValue.trim() || isTyping}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90"
                    >
                      <Send className="h-4 w-4" />
                      发送
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ========== Tab 2: 知识图谱 ========== */}
          <TabsContent value="knowledge" className="mt-0">
            <div className="mx-auto max-w-5xl space-y-6">
              {/* 学习进度 */}
              <Card className="shadow-lg border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">学习进度</h3>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {progressPercent}%
                    </Badge>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    已学习 {learnedCount} / {totalTopics} 个知识点 · 继续加油！
                  </p>
                </CardContent>
              </Card>

              {/* 四大核心素养 */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  五维能力框架
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {coreLiteracies.map((literacy) => {
                    const Icon = iconMap[literacy.icon] || BookOpen;
                    const learnedInCategory = knowledgeBase.filter(
                      (k) => k.category === literacy.name && learnedTopics.has(k.id)
                    ).length;
                    const totalInCategory = knowledgeBase.filter(
                      (k) => k.category === literacy.name
                    ).length;

                    return (
                      <Card
                        key={literacy.id}
                        className="shadow-md hover:shadow-lg transition-shadow border-t-4"
                        style={{ borderTopColor: literacy.color }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                              style={{ backgroundColor: literacy.color }}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">{literacy.name}</CardTitle>
                              <CardDescription className="text-xs mt-0.5">
                                {learnedInCategory}/{totalInCategory} 已学习
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                            {literacy.desc}
                          </p>
                          <div className="space-y-1.5">
                            {literacy.points.map((point, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs">
                                <CheckCircle2
                                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                                  style={{ color: literacy.color }}
                                />
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* 素养层级定位 */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  素养层级定位
                </h3>
                <Card className="shadow-md">
                  <CardContent className="pt-6 pb-6">
                    <div className="space-y-4">
                      {literacyLevels.map((level, i) => (
                        <div key={level.id} className="flex items-center gap-4">
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-sm shadow-md"
                              style={{ backgroundColor: level.color }}
                            >
                              {i + 1}
                            </div>
                            {i < literacyLevels.length - 1 && (
                              <div className="w-px h-8 bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{level.name}</h4>
                              <Badge variant="outline" className="text-xs" style={{ color: level.color, borderColor: level.color }}>
                                {level.level}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{level.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 知识点列表 */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  知识点目录（{knowledgeBase.length}个）
                </h3>
                <Card className="shadow-md">
                  <CardContent className="pt-4">
                    <div className="space-y-1">
                      {knowledgeBase.map((entry) => {
                        const isLearned = learnedTopics.has(entry.id);
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              // 切换到问答Tab并发送问题
                              const tabTrigger = document.querySelector('[data-value="chat"]') as HTMLElement;
                              tabTrigger?.click();
                              setTimeout(() => handleSend(entry.question), 300);
                            }}
                          >
                            {isLearned ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm truncate", isLearned && "text-muted-foreground")}>
                                {entry.topic}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {entry.category}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========== Tab 3: 情境挑战 ========== */}
          <TabsContent value="challenge" className="mt-0">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* 挑战进度 */}
              <Card className="shadow-lg border-amber-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <h3 className="font-semibold">挑战进度</h3>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {challengeProgress}%
                    </Badge>
                  </div>
                  <Progress value={challengeProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    已完成 {completedChallenges.size} / {challenges.length} 道挑战题
                  </p>
                </CardContent>
              </Card>

              {/* 挑战区域 */}
              {!currentChallenge ? (
                <Card className="shadow-xl">
                  <CardContent className="pt-6 pb-6 text-center">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg mb-4">
                      <Target className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">情境挑战</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      通过真实情境题目检验你的信息素养。每道题都有详细解析，帮助你在实践中成长。
                    </p>
                    <Button
                      onClick={startRandomChallenge}
                      size="lg"
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      开始随机挑战
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{currentChallenge.title}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            currentChallenge.difficulty === "入门"
                              ? "secondary"
                              : currentChallenge.difficulty === "进阶"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {currentChallenge.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {currentChallenge.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 情境描述 */}
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">情境</p>
                          <p className="text-sm text-blue-900 leading-relaxed">
                            {currentChallenge.scenario}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 问题 */}
                    <p className="font-semibold text-sm">{currentChallenge.question}</p>

                    {/* 选项 */}
                    <div className="space-y-2">
                      {currentChallenge.options.map((option, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const isCorrect = idx === currentChallenge.correctIndex;
                        const showResult = selectedAnswer !== null;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleChallengeAnswer(idx)}
                            disabled={showResult}
                            className={cn(
                              "w-full text-left rounded-lg border-2 p-3 transition-all text-sm flex items-start gap-3",
                              !showResult && "hover:border-blue-300 hover:bg-blue-50 cursor-pointer",
                              showResult && isCorrect && "border-green-400 bg-green-50",
                              showResult && isSelected && !isCorrect && "border-red-400 bg-red-50",
                              showResult && !isCorrect && !isSelected && "border-muted opacity-60",
                              !showResult && "border-border"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                                !showResult && "bg-muted text-muted-foreground",
                                showResult && isCorrect && "bg-green-500 text-white",
                                showResult && isSelected && !isCorrect && "bg-red-500 text-white",
                                showResult && !isCorrect && !isSelected && "bg-muted text-muted-foreground"
                              )}
                            >
                              {showResult && isCorrect ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : showResult && isSelected && !isCorrect ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                String.fromCharCode(65 + idx)
                              )}
                            </span>
                            <span className="pt-0.5">{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 解析 */}
                    {showExplanation && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700 mb-1">
                              {selectedAnswer === currentChallenge.correctIndex
                                ? "✅ 回答正确！"
                                : "❌ 回答错误"}
                            </p>
                            <p className="text-sm text-amber-900 leading-relaxed">
                              {currentChallenge.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    {showExplanation && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={startRandomChallenge}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          下一题
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 挑战列表 */}
              <div>
                <h3 className="text-sm font-bold mb-3 text-muted-foreground">所有挑战题</h3>
                <div className="space-y-2">
                  {challenges.map((ch) => {
                    const isCompleted = completedChallenges.has(ch.id);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setCurrentChallenge(ch);
                          setSelectedAnswer(null);
                          setShowExplanation(false);
                        }}
                        className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
                        )}
                        <span className="text-sm flex-1 truncate">{ch.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {ch.difficulty}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ========== 底部 ========== */}
      <footer className="border-t bg-white/50 mt-8 py-4">
        <div className="container mx-auto px-4 text-center">
          <Separator className="mb-4" />
          <p className="text-xs text-muted-foreground">
            信息素养智能体 · 基于GB/T 43466—2023国家标准与ACRL五维能力框架 · 理论依据来源：SHEG、McGrew、Ghazi等研究
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            五维能力：信息意识 · 信息获取 · 信息评价 · 信息利用 · 信息道德
          </p>
        </div>
      </footer>
    </div>
  );
};

// ========== 消息气泡组件 ==========
function MessageBubble({
  message,
  onSuggestionClick,
}: {
  message: ChatMessage;
  onSuggestionClick: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isUser ? "bg-purple-100 text-purple-700" : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
          )}
        >
          {isUser ? "我" : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={cn("flex-1 max-w-[80%]", isUser && "flex justify-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-tr-sm"
              : "bg-white border shadow-sm rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            renderMarkdown(message.content)
          )}
        </div>

        {/* 推荐追问 */}
        {message.suggestions && message.suggestions.length > 0 && !isUser && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="text-xs rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 打字指示器 ==========
function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-tl-sm bg-white border shadow-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default Index;
