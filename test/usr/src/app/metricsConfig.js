module.exports = {
	metrics: {
		counter: [
			{
				name: "hello_total",
				help: "number of times said hello",
				labelNames: ["name"]
			},
			{
				name: "goodbye_total",
				help: "number of times said goodbye",
				labelNames: ["name"]
			}
		],
		summary: [
			{
				name: "some_latency",
				help: "some kind of latency",
				percentiles: [0.5, 0.99, 0.999]
			}
		]
	},
	recording_rules: [
		{
			record: "hello_balance",
			expr: "hello_total - goodbye_total"
		}
	],
	alerting_rules: [
		{
			alert: "TooManyHellos",
			expr: "hello_balance > 3",
			annotations: {
				summary: "too many hellos",
				description: "hello_balance > 3, = {{ $value }}"
			}
		},
		{
			alert: "SummaryDegraded",
			expr: "some_latency{q=\"0.99\"} > 1000",
			annotations: {
				summary: "latency degraded",
				description: "latency 99th percentile > 1000, = {{ $value }}"
			}
		}
	],
	dashboards: [
		{
			uid: "mock_svc",
			title: "Mock SVC dashboard",
			panels: [
				{
					title: "greetings",
					type: "graph",
					targets: [
						{
							expr: "increase(hello_total[10s]",
							legendFormat: "{{name}}"
						},
						{
							expr: "increase(goodbye_total[10s]",
							legendFormat: "{{name}}"
						}
					],
					yaxes: [
						{ min: 0, decimals: 0 }
					]
				},
				{
					title: "latency",
					type: "graph",
					targets: [
						{
							expr:  "some_latency",
							legendFormat: "{{q}}"
						}
					]
				}
			]
		}
	]
}
