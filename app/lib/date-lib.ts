/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import { ref } from "vue";

const dayOption = ref(33);
const toDay = new Date();
const issuesDate = ref(Date.now());

interface MonthLists {
  [key: string]: {
    monthNames: string[];
    monthNamesShort: string[];
  };
}

const setDayOption = (item: number) => {
  const current = dayOptions.find((x) => x.value === item);
  if (current) {
    const start = new Date(issuesDate.value);

    switch (current.mode) {
      case "day":
        expiredDate.value = new Date(issuesDate.value).setDate(
          start.getDate() + item
        );
        break;
      case "month":
        const month = current.value.toString().split("")[1];
        expiredDate.value = new Date(issuesDate.value).setMonth(
          start.getMonth() + parseInt(month)
        );
        break;
      case "year":
        const year = current.value.toString().split("")[1];
        expiredDate.value = new Date(issuesDate.value).setFullYear(
          start.getFullYear() + parseInt(year)
        );
        break;
      default:
        break;
    }
  }
};

const calculateExpiredDate = (startDate: any, value: number) => {
  const start = new Date(startDate);
  const current = dayOptions.find((x) => x.value === value);

  if (current) {
    switch (current.mode) {
      case "day":
        return new Date(start.setDate(start.getDate() + value)).getTime();
      case "month":
        const month = current.value.toString().split("")[1];
        return new Date(
          start.setMonth(start.getMonth() + parseInt(month))
        ).getTime();
      case "year":
        const year = current.value.toString().split("")[1];
        return new Date(
          start.setFullYear(start.getFullYear() + parseInt(year))
        ).getTime();
      default:
        return null;
    }
  }
  return null;
};

const dayOptions = [
  { label: "3", value: 3, mode: "day" },
  { label: "7", value: 7, mode: "day" },
  { label: "14", value: 14, mode: "day" },
  { label: "1", value: 21, mode: "month" },
  { label: "2", value: 22, mode: "month" },
  { label: "3", value: 23, mode: "month" },
  { label: "6", value: 26, mode: "month" },
  { label: "1", value: 31, mode: "year" },
  { label: "2", value: 32, mode: "year" },
  { label: "3", value: 33, mode: "year" },
];

const expiredDate = ref(calculateExpiredDate(toDay, dayOption.value));

export const monthLists: MonthLists = {
  en: {
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    monthNamesShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
  },
  lo: {
    monthNames: [
      "ມັງກອນ",
      "ກຸມພາ",
      "ມິນາ",
      "ເມສາ",
      "ພຶດສະພາ",
      "ມິຖຸນາ",
      "ກໍລະກົດ",
      "ສິງຫາ",
      "ກັນຍາ",
      "ຕຸລາ",
      "ພະຈິກ",
      "ທັນວາ",
    ],
    monthNamesShort: [
      "ມກ",
      "ກພ",
      "ມນ",
      "ມສ",
      "ພສ",
      "ມຖນ",
      "ກລກ",
      "ສຫ",
      "ກຍ",
      "ຕລ",
      "ພຈ",
      "ທວ",
    ],
  },
};

export {
  dayOption,
  toDay,
  issuesDate,
  expiredDate,
  setDayOption,
  dayOptions,
  calculateExpiredDate,
};

// count by month to data chart
export function countByMonth(items: any[], fieldName: string = "onDate") {
  const monthCounts = new Array(12).fill(0);

  items.forEach((item) => {
    const data = new Date(item[fieldName]);
    const month = data.getMonth();
    monthCounts[month]++;
  });

  return monthCounts;
}
