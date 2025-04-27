"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log("--- seed.ts execution started ---");
var path_1 = __importDefault(require("path"));
var dotenv_1 = __importDefault(require("dotenv"));
var bcryptjs_1 = __importDefault(require("bcryptjs"));
try {
    console.log("Attempting to load .env...");
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
    console.log(".env loaded. DATABASE_URL set:", !!process.env.DATABASE_URL);
}
catch (dotenvError) {
    console.error("ERROR loading .env:", dotenvError);
    // Decide if you want to exit if .env fails
    // process.exit(1);
}
var client_1 = require("@prisma/client");
console.log("Attempting to instantiate PrismaClient...");
var prisma = new client_1.PrismaClient();
console.log("PrismaClient instantiated.");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var hashedPassword, googleFirst, bob, hybrid, verge, ltt, mkbhd, vergeVideo, lttVideo, mkbhdVideo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🌱 Seeding database... START");
                    // Re-enable operations
                    // —— Cleanup existing data ——
                    console.log("--- Cleaning up existing data ---");
                    return [4 /*yield*/, prisma.collectionItem.deleteMany()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prisma.collection.deleteMany()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.video.deleteMany()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.channel.deleteMany()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.googleToken.deleteMany()];
                case 5:
                    _a.sent(); // Ensure tokens are cleared too
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 6:
                    _a.sent();
                    console.log("✓ Cleanup complete.");
                    // Hash a password for native users
                    console.log("--- Hashing password ---");
                    return [4 /*yield*/, bcryptjs_1.default.hash(process.env.DEFAULT_PASSWORD || "password123", 10)];
                case 7:
                    hashedPassword = _a.sent();
                    console.log("✓ Password hashed.");
                    // —— Create users with different authentication methods ——
                    console.log("--- Creating Users ---");
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: process.env.GOOGLE_TEST_EMAIL || "test@test.com",
                                username: "google-first",
                                googleId: process.env.GOOGLE_TEST_ID || "google_oauth_id_placeholder",
                                password: hashedPassword, // Add hashed password
                                name: "Google First User",
                                image: "https://i.pravatar.cc/150?img=1",
                                role: client_1.Role.USER,
                            },
                        })];
                case 8:
                    googleFirst = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: "bob@example.com",
                                username: "bob",
                                name: "Bob Example",
                                image: "https://i.pravatar.cc/150?img=2",
                                role: client_1.Role.USER,
                                password: hashedPassword,
                            },
                        })];
                case 9:
                    bob = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: process.env.GOOGLE_TEST_EMAIL_2 || "charlie@example.com",
                                username: "hybrid",
                                googleId: process.env.GOOGLE_TEST_ID_2 || "google_oauth_id_placeholder_2",
                                name: "Hybrid User",
                                image: "https://i.pravatar.cc/150?img=3",
                                role: client_1.Role.USER,
                                password: hashedPassword,
                            },
                        })];
                case 10:
                    hybrid = _a.sent();
                    console.log("✓ Users created:");
                    console.log({ googleFirst: googleFirst, bob: bob, hybrid: hybrid });
                    // Add Google tokens for googleFirst
                    console.log("--- Creating Google Token for googleFirst ---");
                    return [4 /*yield*/, prisma.googleToken.create({
                            data: {
                                userId: googleFirst.id,
                                accessToken: process.env.GOOGLE_TEST_ACCESS_TOKEN || "test_access_token_googleFirst",
                                refreshToken: process.env.GOOGLE_TEST_REFRESH_TOKEN ||
                                    "test_refresh_token_googleFirst",
                                expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
                                // Add dummy scope/type if needed for testing, or leave null
                                // scope: "test_scope",
                                // tokenType: "Bearer",
                            },
                        })];
                case 11:
                    _a.sent();
                    console.log("✓ Google Token for googleFirst created.");
                    // Add Google tokens for hybrid
                    console.log("--- Creating Google Token for hybrid ---");
                    return [4 /*yield*/, prisma.googleToken.create({
                            data: {
                                userId: hybrid.id,
                                accessToken: process.env.GOOGLE_TEST_ACCESS_TOKEN_2 || "test_access_token_hybrid",
                                refreshToken: process.env.GOOGLE_TEST_REFRESH_TOKEN_2 || "test_refresh_token_hybrid",
                                expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
                                // Add dummy scope/type if needed for testing, or leave null
                                // scope: "test_scope_hybrid",
                                // tokenType: "Bearer",
                            },
                        })];
                case 12:
                    _a.sent();
                    console.log("✓ Google Token for hybrid created.");
                    // —— Create realistic tech channels ——
                    console.log("--- Creating Channels ---");
                    return [4 /*yield*/, prisma.channel.create({
                            data: {
                                youtubeId: "UCddiUEpeqJcYeBxFu_BnGOA",
                                title: "The Verge",
                                thumbnail: "https://yt3.googleusercontent.com/ytc/APkrFKaqca-rGQnQc3X7X9qZsZUMXmBZJ9Xz6K8QJ8KZ=s176-c-k-c0x00ffffff-no-rj",
                                subscriberCount: 3000000,
                                subscribers: { connect: [{ id: googleFirst.id }, { id: hybrid.id }] },
                            },
                        })];
                case 13:
                    verge = _a.sent();
                    return [4 /*yield*/, prisma.channel.create({
                            data: {
                                youtubeId: "UCXuqSBlHAE6Xw-yeJA0Tunw",
                                title: "Linus Tech Tips",
                                thumbnail: "https://yt3.googleusercontent.com/ytc/APkrFKYcYswt_UhD7D0j6ddiQz6Gb8Qmh9YxYVt8w=s176-c-k-c0x00ffffff-no-rj",
                                subscriberCount: 15000000,
                                subscribers: { connect: [{ id: bob.id }, { id: hybrid.id }] },
                            },
                        })];
                case 14:
                    ltt = _a.sent();
                    return [4 /*yield*/, prisma.channel.create({
                            data: {
                                youtubeId: "UCBJycsmduvYEL83R_U4JriQ",
                                title: "MKBHD",
                                thumbnail: "https://yt3.googleusercontent.com/ytc/APkrFKaqca-rGQnQc3X7X9qZsZUMXmBZJ9Xz6K8QJ8KZ=s176-c-k-c0x00ffffff-no-rj",
                                subscriberCount: 18000000,
                                subscribers: {
                                    connect: [{ id: googleFirst.id }, { id: bob.id }, { id: hybrid.id }],
                                },
                            },
                        })];
                case 15:
                    mkbhd = _a.sent();
                    console.log("✓ Channels created.");
                    console.log({ verge: verge, ltt: ltt, mkbhd: mkbhd });
                    // —— Create some realistic videos ——
                    console.log("--- Creating Videos ---");
                    return [4 /*yield*/, prisma.video.create({
                            data: {
                                youtubeId: "verge2024",
                                title: "The Verge's 2024 Tech Predictions",
                                thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                                publishedAt: new Date("2024-01-01"),
                                channelId: verge.id,
                            },
                        })];
                case 16:
                    vergeVideo = _a.sent();
                    return [4 /*yield*/, prisma.video.create({
                            data: {
                                youtubeId: "lttgaming",
                                title: "Building the Ultimate Gaming PC",
                                thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                                publishedAt: new Date("2024-02-01"),
                                channelId: ltt.id,
                            },
                        })];
                case 17:
                    lttVideo = _a.sent();
                    return [4 /*yield*/, prisma.video.create({
                            data: {
                                youtubeId: "iphone15review",
                                title: "iPhone 15 Pro Review: Worth the Upgrade?",
                                thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                                publishedAt: new Date("2024-03-01"),
                                channelId: mkbhd.id,
                            },
                        })];
                case 18:
                    mkbhdVideo = _a.sent();
                    console.log("✓ Videos created.");
                    console.log({ vergeVideo: vergeVideo, lttVideo: lttVideo, mkbhdVideo: mkbhdVideo });
                    // —— Create collections for googleFirst ——
                    console.log("--- Creating Collections for googleFirst ---");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "favorites",
                                name: "Favorites",
                                description: "My favorite tech channels",
                                isPublic: true,
                                userId: googleFirst.id,
                                items: {
                                    create: [{ channelId: verge.id }, { channelId: mkbhd.id }],
                                },
                            },
                        })];
                case 19:
                    _a.sent();
                    console.log("✓ Collection 1 for googleFirst created.");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "untitled",
                                name: "Untitled",
                                description: "My untitled collection",
                                isPublic: false,
                                userId: googleFirst.id,
                                items: {
                                    create: [{ channelId: ltt.id }],
                                },
                            },
                        })];
                case 20:
                    _a.sent();
                    console.log("✓ Collection 2 for googleFirst created.");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "watch-later",
                                name: "Watch Later",
                                description: "Videos to watch later",
                                isPublic: false,
                                userId: googleFirst.id,
                                items: {
                                    create: [{ videoId: vergeVideo.id }, { videoId: mkbhdVideo.id }],
                                },
                            },
                        })];
                case 21:
                    _a.sent();
                    console.log("✓ Collection 3 for googleFirst created.");
                    // —— Create collections for Bob ——
                    console.log("--- Creating Collections for Bob ---");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "tech-channels",
                                name: "Tech Channels",
                                description: "Great tech content creators",
                                isPublic: true,
                                userId: bob.id,
                                items: {
                                    create: [{ channelId: ltt.id }, { channelId: mkbhd.id }],
                                },
                            },
                        })];
                case 22:
                    _a.sent();
                    console.log("✓ Collection 1 for Bob created.");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "untitled",
                                name: "Untitled",
                                description: "My untitled collection",
                                isPublic: false,
                                userId: bob.id,
                                items: {
                                    create: [{ channelId: verge.id }],
                                },
                            },
                        })];
                case 23:
                    _a.sent();
                    console.log("✓ Collection 2 for Bob created.");
                    // —— Create collections for hybrid ——
                    console.log("--- Creating Collections for hybrid ---");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "tech-mix",
                                name: "Tech Mix",
                                description: "A mix of tech content",
                                isPublic: true,
                                userId: hybrid.id,
                                items: {
                                    create: [
                                        { channelId: verge.id },
                                        { channelId: ltt.id },
                                        { channelId: mkbhd.id },
                                    ],
                                },
                            },
                        })];
                case 24:
                    _a.sent();
                    console.log("✓ Collection 1 for hybrid created.");
                    return [4 /*yield*/, prisma.collection.create({
                            data: {
                                slug: "untitled",
                                name: "Untitled",
                                description: "My untitled collection",
                                isPublic: false,
                                userId: hybrid.id,
                                items: {
                                    create: [{ videoId: lttVideo.id }],
                                },
                            },
                        })];
                case 25:
                    _a.sent();
                    console.log("✓ Collection 2 for hybrid created.");
                    console.log("✅ Seeding complete!");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
