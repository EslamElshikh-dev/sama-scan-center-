"use client";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { snapshot } from "@/lib/dashboard/snapshot";

const google = [
  { name: "الاتصال", السابق: snapshot.google.previous.calls, الحالي: snapshot.google.current.calls },
  { name: "الاتجاهات", السابق: snapshot.google.previous.directions, الحالي: snapshot.google.current.directions },
  { name: "المشاهدات", السابق: snapshot.google.previous.views, الحالي: snapshot.google.current.views },
  { name: "الموقع", السابق: snapshot.google.previous.website, الحالي: snapshot.google.current.website },
];
const search = [
  { name: "12–18 سبتمبر", الظهور: 261, النقرات: 10 },
  { name: "19–25 سبتمبر", الظهور: 342, النقرات: 5 },
];
const mix = [{ name: "مراكز أشعة", value: 3 }, { name: "أقسام مستشفيات", value: 2 }];
const tooltip = { borderRadius: 12, borderColor: "#dce8ed", fontFamily: "Tahoma", direction: "rtl" as const };

export function GoogleComparisonChart() { return <div className="analytics-chart" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={google} margin={{ top: 12, right: 12, left: -15, bottom: 0 }} barGap={4}><CartesianGrid vertical={false} stroke="#e9f0f5"/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#78919f", fontSize: 12 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "#78919f", fontSize: 11 }}/><Tooltip contentStyle={tooltip}/><Bar dataKey="السابق" fill="#93b7c5" radius={[5,5,0,0]} maxBarSize={32} animationDuration={750}/><Bar dataKey="الحالي" fill="#087f9c" radius={[5,5,0,0]} maxBarSize={32} animationDuration={1000}/></BarChart></ResponsiveContainer></div>; }
export function SearchChart() { return <div className="analytics-chart" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={search} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e9f0f5"/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#78919f", fontSize: 12 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "#78919f", fontSize: 11 }}/><Tooltip contentStyle={tooltip}/><Bar dataKey="الظهور" fill="#087f9c" radius={[6,6,0,0]} maxBarSize={52} animationDuration={850}/><Bar dataKey="النقرات" fill="#e4aa54" radius={[6,6,0,0]} maxBarSize={52} animationDuration={1000}/></BarChart></ResponsiveContainer></div>; }
export function CompetitorMixChart() { return <div className="donut-wrap"><div className="donut-chart" dir="ltr"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={mix} cx="50%" cy="50%" innerRadius={67} outerRadius={95} dataKey="value" startAngle={90} endAngle={-270} stroke="none" animationDuration={850}>{mix.map((d,i)=><Cell key={d.name} fill={i===0?"#087f9c":"#77c7cf"}/>)}</Pie><Tooltip contentStyle={tooltip}/></PieChart></ResponsiveContainer></div><div className="donut-center"><strong>5</strong><span>جهات</span></div></div>; }
