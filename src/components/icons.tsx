/**
 * The app's icon set: Phosphor icons exported under the names the code already uses. They render in the
 * single-tone regular weight unless a surrounding <DuotoneIcons> switches them to duotone (the sidebar).
 * Small UI glyphs — arrows, chevrons, check, close, plus / minus, kebab, spinner — come from lucide.
 */
import { forwardRef, type ComponentPropsWithoutRef, type ComponentType } from "react"
import * as P from "@phosphor-icons/react"
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react"

export type AppIconProps = ComponentPropsWithoutRef<"svg"> & { size?: number | string; weight?: IconWeight }
export type AppIcon = ComponentType<AppIconProps>

function duo(Icon: PhosphorIcon, name: string): AppIcon {
  const C = forwardRef<SVGSVGElement, AppIconProps>(function WrappedIcon({ size = 24, className, ...props }, ref) {
    return <Icon ref={ref} size={size} className={className ? `duo-icon ${className}` : "duo-icon"} {...props} />
  })
  C.displayName = name
  return C
}

// ── single-tone glyphs ──
export {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Check, CheckIcon, ChevronDown, ChevronDownIcon, ChevronLeft,
  ChevronLeftIcon, ChevronRight, ChevronRightIcon, ChevronUpIcon, ChevronsUpDown, CircleIcon, Download, Loader2Icon, Minus, MinusIcon,
  MoreHorizontal, MoreHorizontalIcon, Pause, Plus, X, XIcon,
} from "lucide-react"

// ── Phosphor ──
export const AlarmClock = duo(P.Alarm, "AlarmClock")
export const AlertCircle = duo(P.WarningCircle, "AlertCircle")
export const AlertTriangle = duo(P.Warning, "AlertTriangle")
export const BadgeCheck = duo(P.SealCheck, "BadgeCheck")
export const BadgeIndianRupee = duo(P.Money, "BadgeIndianRupee")
export const Ban = duo(P.Prohibit, "Ban")
export const Bell = duo(P.Bell, "Bell")
export const BellRing = duo(P.BellRinging, "BellRing")
export const BriefcaseBusiness = duo(P.Briefcase, "BriefcaseBusiness")
export const Building = duo(P.Building, "Building")
export const Building2 = duo(P.Buildings, "Building2")
export const CalendarCheck = duo(P.CalendarCheck, "CalendarCheck")
export const CalendarCheck2 = duo(P.CalendarCheck, "CalendarCheck2")
export const CalendarClock = duo(P.CalendarDots, "CalendarClock")
export const CalendarDays = duo(P.CalendarDots, "CalendarDays")
export const CalendarIcon = duo(P.CalendarBlank, "CalendarIcon")
export const CalendarPlus = duo(P.CalendarPlus, "CalendarPlus")
export const CalendarX = duo(P.CalendarX, "CalendarX")
export const CheckCheck = duo(P.Checks, "CheckCheck")
export const CheckCircle2 = duo(P.CheckCircle, "CheckCircle2")
export const CircleAlert = duo(P.WarningCircle, "CircleAlert")
export const CircleCheck = duo(P.CheckCircle, "CircleCheck")
export const CircleCheckIcon = duo(P.CheckCircle, "CircleCheckIcon")
export const CircleDot = duo(P.RadioButton, "CircleDot")
export const CircleX = duo(P.XCircle, "CircleX")
export const Clock = duo(P.Clock, "Clock")
export const Clock3 = duo(P.Clock, "Clock3")
export const Cloud = duo(P.Cloud, "Cloud")
export const Coins = duo(P.Coins, "Coins")
export const Columns3 = duo(P.Columns, "Columns3")
export const Compass = duo(P.Compass, "Compass")
export const Copy = duo(P.Copy, "Copy")
export const ExternalLink = duo(P.ArrowSquareOut, "ExternalLink")
export const FileBarChart = duo(P.ChartBar, "FileBarChart")
export const FileCheck2 = duo(P.Certificate, "FileCheck2")
export const FileClock = duo(P.ClockCountdown, "FileClock")
export const FileDown = duo(P.FileArrowDown, "FileDown")
export const FileSearch = duo(P.FileMagnifyingGlass, "FileSearch")
export const FileText = duo(P.FileText, "FileText")
export const FilePdf = duo(P.FilePdf, "FilePdf")
export const FileDoc = duo(P.FileDoc, "FileDoc")
export const FileXls = duo(P.FileXls, "FileXls")
export const FileCsv = duo(P.FileCsv, "FileCsv")
export const FilePpt = duo(P.FilePpt, "FilePpt")
export const FileImage = duo(P.FileImage, "FileImage")
export const FileZip = duo(P.FileZip, "FileZip")
export const FileTxt = duo(P.FileTxt, "FileTxt")
export const FileBlank = duo(P.File, "FileBlank")
export const FileUp = duo(P.FileArrowUp, "FileUp")
export const FlaskConical = duo(P.Flask, "FlaskConical")
export const FolderOpen = duo(P.FolderOpen, "FolderOpen")
export const Forward = duo(P.ArrowBendUpRight, "Forward")
export const Globe2 = duo(P.Globe, "Globe2")
export const Handshake = duo(P.Handshake, "Handshake")
export const HardHat = duo(P.HardHat, "HardHat")
export const History = duo(P.ClockCounterClockwise, "History")
export const Hourglass = duo(P.Hourglass, "Hourglass")
export const Inbox = duo(P.Tray, "Inbox")
export const InfoIcon = duo(P.Info, "InfoIcon")
export const KeyRound = duo(P.Key, "KeyRound")
export const LayoutDashboard = duo(P.SquaresFour, "LayoutDashboard")
export const LayoutList = duo(P.Rows, "LayoutList")
export const Link2 = duo(P.Link, "Link2")
export const List = duo(P.ListBullets, "List")
export const ListFilter = duo(P.Funnel, "ListFilter")
export const Lock = duo(P.Lock, "Lock")
export const LogOut = duo(P.SignOut, "LogOut")
export const Mail = duo(P.Envelope, "Mail")
export const MailPlus = duo(P.EnvelopeSimple, "MailPlus")
export const MailQuestion = duo(P.EnvelopeOpen, "MailQuestion")
export const MapPin = duo(P.MapPin, "MapPin")
export const MapPinPlus = duo(P.MapPinPlus, "MapPinPlus")
export const MapPinned = duo(P.MapPinArea, "MapPinned")
export const Maximize2 = duo(P.ArrowsOut, "Maximize2")
export const MessageSquareText = duo(P.ChatText, "MessageSquareText")
export const MessageSquareWarning = duo(P.ChatCenteredDots, "MessageSquareWarning")
export const MessagesSquare = duo(P.ChatsCircle, "MessagesSquare")
export const OctagonAlert = duo(P.WarningOctagon, "OctagonAlert")
export const OctagonXIcon = duo(P.WarningOctagon, "OctagonXIcon")
export const PanelLeftIcon = duo(P.SidebarSimple, "PanelLeftIcon")
export const Paperclip = duo(P.PaperclipHorizontal, "Paperclip")
export const Pencil = duo(P.PencilSimple, "Pencil")
export const PlugZap = duo(P.Plug, "PlugZap")
export const ReceiptText = duo(P.Receipt, "ReceiptText")
export const Reply = duo(P.ArrowBendUpLeft, "Reply")
export const ReplyAll = duo(P.ArrowBendDoubleUpLeft, "ReplyAll")
export const Reschedule = duo(P.ClockClockwise, "Reschedule")
export const RotateCcw = duo(P.ArrowCounterClockwise, "RotateCcw")
export const RotateCw = duo(P.ArrowClockwise, "RotateCw")
export const Save = duo(P.FloppyDisk, "Save")
export const Search = duo(P.MagnifyingGlass, "Search")
export const SearchIcon = duo(P.MagnifyingGlass, "SearchIcon")
export const SearchX = duo(P.MagnifyingGlassMinus, "SearchX")
export const Send = duo(P.PaperPlaneTilt, "Send")
export const Settings = duo(P.GearSix, "Settings")
export const ShieldAlert = duo(P.ShieldWarning, "ShieldAlert")
export const ShieldCheck = duo(P.ShieldCheck, "ShieldCheck")
export const Tag = duo(P.Tag, "Tag")
export const Trash2 = duo(P.TrashSimple, "Trash2")
export const TriangleAlertIcon = duo(P.Warning, "TriangleAlertIcon")
export const Truck = duo(P.Truck, "Truck")
export const Unplug = duo(P.Plugs, "Unplug")
export const Upload = duo(P.UploadSimple, "Upload")
export const UserCheck = duo(P.UserCheck, "UserCheck")
export const UserPlus = duo(P.UserPlus, "UserPlus")
export const UserRound = duo(P.User, "UserRound")
export const Users = duo(P.Users, "Users")
export const UsersRound = duo(P.UsersThree, "UsersRound")
export const Wallet = duo(P.Wallet, "Wallet")
export const Zap = duo(P.Lightning, "Zap")
