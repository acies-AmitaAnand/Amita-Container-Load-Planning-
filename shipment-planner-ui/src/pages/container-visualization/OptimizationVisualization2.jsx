import React, { useState, useEffect } from "react";
import MultiContainerView from "./MultiContainerView";

export default function OptimizationVisualization2() {
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [showSummary, setShowSummary] = useState(false);

    const [activeStep, setActiveStep] = useState(1);
    const [selectedLane, setSelectedLane] = useState("");
    const [selectedDate, setSelectedDate] = useState("");

    const [results, setResults] = useState([]);
    const [lanes, setLanes] = useState([]);
    const [dates, setDates] = useState([]);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const response = await fetch("/api/results");
            const result = await response.json();

            setOptimizationResult(result);
            setResults(result.results || []);
            setLanes(result.lanes || []);
            setDates(result.dates || []);
        } catch (error) {
            console.error("Error fetching results:", error);
        }
    };

    const optimize = async () => {
        try {
            const optimizerState = await aSyncOptimizer();

            if (!optimizerState) {
                throw new Error("No optimization result");
            }

            setOptimizationResult(optimizerState);
            localStorage.setItem(
                "optimizationResult",
                JSON.stringify(optimizerState)
            );

            setResults(optimizerState.results || []);
            setLanes(optimizerState.lanes || []);
            setDates(optimizerState.dates || []);

            setShowSummary(true);
        } catch (error) {
            console.error("Failed to optimize:", error);
        }
    };

    const goToStep = (step) => {
        setActiveStep(step);
    };

    const renderOptimizationDetail = () => {
        switch (activeStep) {
            case 1:
                return (
                    <div className="p-4 bg-gray-50 border rounded">
                        <h3 className="text-lg font-bold mb-2">
                            Optimization Summary
                        </h3>

                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th>Lane</th>
                                    <th>Date</th>
                                    <th>Containers</th>
                                    <th>Pallets</th>
                                    <th>Weight</th>
                                    <th>Volume</th>
                                    <th>Floor Util</th>
                                    <th>CoG</th>
                                </tr>
                            </thead>

                            <tbody>
                                {results.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.lane}</td>
                                        <td>{item.date}</td>
                                        <td>{item.containers?.length ?? 0}</td>
                                        <td>{item.pallets?.length ?? 0}</td>
                                        <td>{item.weight}</td>
                                        <td>{item.volume}</td>
                                        <td>{item.floorUtil}</td>
                                        <td>{item.cog}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <button
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                            onClick={() => goToStep(2)}
                        >
                            Next
                        </button>
                    </div>
                );

            case 2:
                return (
                    <div className="p-4 bg-gray-50 border rounded">
                        <h3 className="text-lg font-bold mb-2">
                            Lane / Route Selector
                        </h3>

                        <select
                            className="border p-2"
                            value={selectedLane}
                            onChange={(e) => {
                                setSelectedLane(e.target.value);
                                goToStep(3);
                            }}
                        >
                            <option value="">Select Lane</option>

                            {lanes.map((lane) => (
                                <option key={lane} value={lane}>
                                    {lane}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 3:
                return (
                    <div className="p-4 bg-gray-50 border rounded">
                        <h3 className="text-lg font-bold mb-2">Date List</h3>

                        {dates.map((date) => (
                            <button
                                key={date}
                                className="block w-full mb-2 px-3 py-2 bg-blue-500 text-white rounded"
                                onClick={() => {
                                    setSelectedDate(date);
                                    goToStep(4);
                                }}
                            >
                                {date}
                            </button>
                        ))}
                    </div>
                );

            case 4: {
                const result = results.find(
                    (r) =>
                        r.date === selectedDate &&
                        (!selectedLane || r.lane === selectedLane)
                );

                return (
                    <div className="p-4 bg-gray-50 border rounded">
                        <h3 className="text-lg font-bold mb-2">
                            Container Detail
                        </h3>

                        {result ? (
                            <>
                                <p className="mb-4">
                                    Showing details for {selectedLane} - {selectedDate}
                                </p>

                                <MultiContainerView data={result} />
                            </>
                        ) : (
                            <p className="text-red-500">
                                No detail found.
                            </p>
                        )}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    if (showSummary && optimizationResult) {
        return (
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => setShowSummary(false)}
                    className="px-3 py-2 border rounded"
                >
                    Back
                </button>

                {renderOptimizationDetail()}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 max-w-md mx-auto mt-5">
            <h3 className="text-xl font-bold">
                Optimize and View Results
            </h3>

            <button
                onClick={optimize}
                className="px-6 py-2 bg-blue-500 text-white rounded"
            >
                RUN OPTIMIZATION
            </button>

            {optimizationResult && (
                <>
                    <MultiContainerView data={optimizationResult} />

                    <button
                        onClick={() => setShowSummary(true)}
                        className="px-6 py-2 bg-green-600 text-white rounded"
                    >
                        SHOW OPTIMIZATION SUMMARY
                    </button>
                </>
            )}
        </div>
    );
}

async function aSyncOptimizer() {
    return new Promise((resolve) =>
        setTimeout(
            () =>
                resolve({
                    result_type: "container",
                    containers: [],
                    pallets: [{ id: 1, weight: 50 }],
                    lanes: ["lane-a", "lane-b"],
                    dates: ["2023-01-01", "2023-01-05"],
                    results: [
                        {
                            lane: "lane-a",
                            date: "2023-01-01",
                            containers: [],
                            pallets: [{ id: 1 }],
                            weight: 1000,
                            volume: 25,
                            floorUtil: "82%",
                            cog: "Centered",
                        },
                    ],
                }),
            1000
        )
    );
}
