/**
 * 信息素养智能问答引擎
 * 基于关键词匹配 + 意图识别 + 知识检索的对话式问答系统
 */

import { knowledgeBase, type KnowledgeEntry } from "@/data/knowledge";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  relatedKnowledge?: string[]; // 关联知识ID
  suggestions?: string[];       // 推荐追问
}

export interface MatchResult {
  entry: KnowledgeEntry;
  score: number;
}

// ========== 意图识别 ==========
interface IntentRule {
  intent: string;
  patterns: string[];
  response: string;
  suggestions?: string[];
}

const intentRules: IntentRule[] = [
  {
    intent: "greeting",
    patterns: ["你好", "您好", "hi", "hello", "嗨", "在吗", "你是谁", "介绍一下"],
    response:
      "你好！我是信息素养小助手 🤖\n\n我专门帮助初中同学学习和提升信息素养，覆盖以下四大核心素养：\n\n📌 **信息意识** — 对信息的敏感度和价值判断\n📌 **计算思维** — 问题分解、算法设计、模式识别\n📌 **数字化学习与创新** — 数字工具运用与创造性实践\n📌 **信息社会责任** — 网络安全、隐私保护、知识产权\n\n你可以直接问我任何信息素养相关的问题，比如：\n• \"怎么辨别假新闻？\"\n• \"什么是计算思维？\"\n• \"怎样保护个人隐私？\"",
    suggestions: ["什么是信息素养？", "怎么辨别假新闻？", "有哪些好用的学习工具？"],
  },
  {
    intent: "thanks",
    patterns: ["谢谢", "感谢", "thanks", "thank you", "多谢", "辛苦了"],
    response: "不客气！如果还有其他信息素养相关的问题，随时问我哦 😊\n\n学习是一个持续的过程，希望这些知识能帮你在数字时代更好地学习和生活。",
    suggestions: ["还有什么要学的？", "给我出一个挑战题"],
  },
  {
    intent: "challenge",
    patterns: ["挑战", "测验", "出题", "考考我", "练习", "测试", "quiz", "做题"],
    response:
      "好！让我来考考你 🔥\n\n你可以点击页面左侧或顶部的「情境挑战」进入挑战模式，那里有不同难度的真实情境题目等你来解答！\n\n每道题都有详细解析，帮助你理解背后的信息素养知识点。",
    suggestions: ["给我出一个入门题", "什么是信息素养？"],
  },
  {
    intent: "what-is-literacy",
    patterns: ["什么是信息素养", "信息素养是什么", "信息素养定义", "信息素养包括", "信息素养有哪些"],
    response:
      "**信息素养**是指个体在信息社会中获取、评价、处理、利用和创造信息的能力，是现代人必备的综合素质。\n\n根据《义务教育信息科技课程标准（2022年版）》，信息素养主要体现在**四大核心素养**：\n\n1️⃣ **信息意识** — 对信息的敏感度和价值判断力\n2️⃣ **计算思维** — 运用计算机科学思想方法解决问题\n3️⃣ **数字化学习与创新** — 运用数字工具开展学习与创造\n4️⃣ **信息社会责任** — 在信息社会中负责任地行动\n\n这四大素养相互关联、相互促进，共同构成初中生信息素养的完整体系。你可以通过对话提问或浏览知识图谱来逐一学习每一项。",
    suggestions: ["怎么辨别假新闻？", "什么是计算思维？", "有哪些好用的学习工具？"],
  },
];

// ========== 闲聊/通用回复 ==========
const fallbackResponses = [
  "这个问题我还需要学习一下 😅\n\n目前我最擅长回答**信息素养**相关的问题，包括：\n• 信息获取与鉴别\n• 计算思维与算法\n• 数字化学习工具\n• 网络安全与隐私保护\n• 知识产权与网络礼仪\n\n你可以试试问：\"怎么辨别假新闻？\"或\"如何保护个人隐私？\"",
  "关于这个问题，我目前的知识库还没有覆盖到 🤔\n\n不过如果你对**信息素养**的任何方面有疑问，我都可以帮你！试试这些问题：\n• 什么是信息素养？\n• 怎样高效搜索信息？\n• 什么是计算思维？\n• 如何安全上网？",
];

// ========== 知识库检索 ==========
function searchKnowledge(query: string): MatchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  const results: MatchResult[] = [];

  for (const entry of knowledgeBase) {
    let score = 0;

    // 关键词精确匹配（权重最高）
    for (const keyword of entry.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }

    // 主题匹配
    if (normalizedQuery.includes(entry.topic.toLowerCase())) {
      score += 8;
    }

    // 问题匹配
    const questionWords = entry.question
      .replace(/[？?，,。.、！!]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);
    for (const word of questionWords) {
      if (normalizedQuery.includes(word.toLowerCase())) {
        score += 3;
      }
    }

    // 答案关键词匹配（权重较低）
    const answerWords = entry.answer
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
    for (const word of answerWords) {
      if (normalizedQuery.includes(word.toLowerCase()) && !entry.keywords.includes(word)) {
        score += 1;
      }
    }

    if (score > 0) {
      results.push({ entry, score });
    }
  }

  // 按分数排序
  results.sort((a, b) => b.score - a.score);
  return results;
}

// ========== 意图识别 ==========
function detectIntent(query: string): IntentRule | null {
  const normalizedQuery = query.toLowerCase().trim();
  for (const rule of intentRules) {
    for (const pattern of rule.patterns) {
      if (normalizedQuery.includes(pattern.toLowerCase())) {
        return rule;
      }
    }
  }
  return null;
}

// ========== 生成推荐追问 ==========
function generateSuggestions(entry: KnowledgeEntry): string[] {
  // 从同一类别中推荐相关问题
  const sameCategory = knowledgeBase
    .filter((e) => e.category === entry.category && e.id !== entry.id)
    .slice(0, 2)
    .map((e) => e.question);

  // 推荐一个其他类别的问题
  const otherCategory = knowledgeBase
    .filter((e) => e.category !== entry.category)
    .sort(() => Math.random() - 0.5)
    .slice(0, 1)
    .map((e) => e.question);

  return [...sameCategory, ...otherCategory].slice(0, 3);
}

// ========== 主回答函数 ==========
export function generateResponse(userQuery: string): {
  content: string;
  relatedKnowledge?: string[];
  suggestions?: string[];
} {
  // 1. 先检测意图
  const intent = detectIntent(userQuery);
  if (intent) {
    return {
      content: intent.response,
      suggestions: intent.suggestions,
    };
  }

  // 2. 检索知识库
  const results = searchKnowledge(userQuery);

  if (results.length === 0) {
    // 无匹配结果
    const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    return {
      content: fallback,
      suggestions: ["什么是信息素养？", "怎么辨别假新闻？", "如何保护个人隐私？"],
    };
  }

  // 3. 取最佳匹配
  const bestMatch = results[0];

  // 4. 如果有多个高相关结果，组合回答
  let content = bestMatch.entry.answer;

  // 添加示例
  if (bestMatch.entry.example) {
    content += `\n\n💡 **举个例子：**\n${bestMatch.entry.example}`;
  }

  // 添加学习建议
  if (bestMatch.entry.tip) {
    content += `\n\n📌 **学习建议：**\n${bestMatch.entry.tip}`;
  }

  // 如果有第二高相关且分数较高的结果，提示关联
  if (results.length > 1 && results[1].score >= 8) {
    content += `\n\n🔗 **你可能还想了解：** ${results[1].entry.question}`;
  }

  return {
    content,
    relatedKnowledge: [bestMatch.entry.id],
    suggestions: generateSuggestions(bestMatch.entry),
  };
}

// ========== 快捷问题 ==========
export const quickQuestions = [
  "什么是信息素养？",
  "什么是评价三问法？",
  "什么是横向阅读？",
  "怎样高效搜索信息？",
  "评价信息意味着什么都不信吗？",
  "怎样区分广告和新闻？",
  "如何尊重知识产权？",
  "什么是数字信用？",
];
